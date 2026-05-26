import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PROFILE_LOAD_TIMEOUT_MS = 5000;

function raceTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [aal, setAal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);

  async function loadProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', userId)
        .maybeSingle();
      setProfile(data ?? null);
    } catch { }
  }

  async function loadAal() {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setAal(data);
    } catch { }
  }

  useEffect(() => {
    let resolved = false;
    const safetyTimer = setTimeout(() => setLoading(false), 6000);

    function resolveLoading() {
      if (!resolved) {
        resolved = true;
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    }

    // Register BEFORE getSession so we don't miss SIGNED_IN fired when
    // Supabase processes the #access_token hash from an OAuth redirect.
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await raceTimeout(
          Promise.allSettled([loadProfile(session.user.id), loadAal()]),
          PROFILE_LOAD_TIMEOUT_MS,
        );
      } else {
        setProfile(null);
        setAal(null);
      }
      resolveLoading();
    });

    // Fallback for cases where onAuthStateChange never fires (no session, no hash).
    raceTimeout(supabase.auth.getSession(), PROFILE_LOAD_TIMEOUT_MS)
      .then(() => resolveLoading())
      .catch(() => resolveLoading());

    return () => { clearTimeout(safetyTimer); data.subscription.unsubscribe(); };
  }, []);

  const signOut = () => supabase.auth.signOut();
  const continueAsGuest = () => setGuest(true);

  const isCoach = profile?.role === 'coach';
  const needsMFA = isCoach && aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2';
  const needsMFASetup = isCoach && aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal1';

  return { user, profile, aal, loading, guest, isCoach, needsMFA, needsMFASetup, signOut, continueAsGuest };
}
