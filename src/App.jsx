import { useState, useCallback, useRef, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import TossupPlayer from './components/TossupPlayer';
import BonusPlayer from './components/BonusPlayer';
import AuthGate from './components/AuthGate';
import MFAChallenge from './components/MFAChallenge';
import MFASetup from './components/MFASetup';
import StatsScreen from './components/StatsScreen';
import CoachDashboard from './components/CoachDashboard';
import AdminDashboard from './components/AdminDashboard';
import { fetchTossups, fetchRandomBonus } from './utils/qbApi';
import { useAuth } from './hooks/useAuth';
import { useSession } from './hooks/useSession';

const INIT_SCORE = { pts: 0, bonusPts: 0, powers: 0, negs: 0, played: 0 };

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  btn: (c = '#C9A227', ghost = false) => ({
    padding: '12px 24px', fontSize: 14, fontWeight: 700,
    border: ghost ? `1px solid ${c}` : 'none',
    borderRadius: 6, background: ghost ? 'transparent' : c,
    color: ghost ? c : '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
  }),
  topBar: { background: '#0d0e16', borderBottom: '1px solid #1e2030', padding: '8px 20px' },
  topBarInner: { maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#4a4d60' },
};

export default function App() {
  const { user, profile, aal, loading, guest, isAdmin, isCoach, needsMFA, needsMFASetup, signOut, continueAsGuest } = useAuth();
  const { saveSession } = useSession(user);

  const [screen, setScreen] = useState('home');
  const [queue, setQueue] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState({ ...INIT_SCORE });
  const [currentBonus, setCurrentBonus] = useState(null);
  const [lastTossupAnswer, setLastTossupAnswer] = useState('');
  const [filters, setFilters] = useState(null);
  const [error, setError] = useState(null);

  const queueRef = useRef(queue);
  queueRef.current = queue;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const handleStart = useCallback(async (opts) => {
    setFilters(opts);
    setError(null);
    setScreen('loading');
    try {
      const tossups = await fetchTossups({ categories: opts.categories, difficulties: opts.difficulties, num: opts.num });
      if (!tossups.length) { setError('No questions returned. Try different settings.'); setScreen('home'); return; }
      setQueue(tossups);
      setQIdx(0);
      setScore({ ...INIT_SCORE });
      setCurrentBonus(null);
      setScreen('tossup');
    } catch (e) {
      setError(`Failed to load questions: ${e.message}`);
      setScreen('home');
    }
  }, []);

  const handleTossupResult = useCallback(async ({ pts, correct, power, tossup, skipped }) => {
    setScore(s => ({ ...s, pts: s.pts + pts, powers: s.powers + (power ? 1 : 0), negs: s.negs + (pts === -5 ? 1 : 0), played: s.played + 1 }));
    if (correct) {
      setLastTossupAnswer(tossup.answer);
      try {
        const bonus = await fetchRandomBonus({ categories: tossup.category ? [tossup.category] : filters?.categories ?? [], difficulties: filters?.difficulties ?? [3, 4, 5] });
        setCurrentBonus(bonus);
      } catch { setCurrentBonus(null); }
      setScreen('bonus');
    } else {
      setQIdx(prev => {
        const next = prev + 1;
        if (next >= queueRef.current.length) { setScreen('results'); return prev; }
        setScreen('tossup');
        return next;
      });
    }
  }, [filters]);

  const handleBonusDone = useCallback(async ({ bonusPts }) => {
    setScore(s => {
      const next = { ...s, bonusPts: s.bonusPts + bonusPts };
      return next;
    });
    setCurrentBonus(null);
    setQIdx(prev => {
      const next = prev + 1;
      if (next >= queueRef.current.length) {
        setScreen('results');
        return prev;
      }
      setScreen('tossup');
      return next;
    });
  }, [filters]);

  const handleRestart = () => { setScreen('home'); setQueue([]); setScore({ ...INIT_SCORE }); setCurrentBonus(null); setError(null); };

  useEffect(() => {
    if (screen === 'results' && user && queueRef.current.length > 0) {
      saveSession(scoreRef.current, filtersRef.current);
    }
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionTotal = score.pts + score.bonusPts;

  // ─── AUTH LOADING ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: '#4a4d60', letterSpacing: 2, textTransform: 'uppercase' }}>Loading...</div>
      </div>
    );
  }

  // ─── AUTH GATE ───────────────────────────────────────────────────
  if (!user && !guest) return <AuthGate onGuest={continueAsGuest} />;

  // ─── COACH MFA SETUP ─────────────────────────────────────────────
  if (needsMFASetup) return <MFASetup />;

  // ─── COACH MFA CHALLENGE ─────────────────────────────────────────
  if (needsMFA) {
    const factors = aal?.currentAuthenticationMethods?.map(m => ({ id: m.factorId })) ?? [];
    return <MFAChallenge factors={factors} />;
  }

  // ─── STATS ───────────────────────────────────────────────────────
  if (screen === 'stats') return <StatsScreen user={user} onBack={() => setScreen('home')} />;

  // ─── COACH DASHBOARD ─────────────────────────────────────────────
  if (screen === 'coach' && isCoach) return <CoachDashboard user={user} onBack={() => setScreen('home')} />;

  // ─── ADMIN DASHBOARD ─────────────────────────────────────────────
  if (screen === 'admin' && isAdmin) return <AdminDashboard user={user} onBack={() => setScreen('home')} />;

  // ─── LOADING ─────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: '#C9A227', marginBottom: 16 }}>○</div>
          <div style={{ color: '#6b7084', letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>Loading questions...</div>
        </div>
      </div>
    );
  }

  // ─── HOME ────────────────────────────────────────────────────────
  if (screen === 'home') {
    return (
      <>
        {user && (
          <div style={S.topBar}>
            <div style={S.topBarInner}>
              <span>{profile?.display_name ?? user.email}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <button onClick={() => setScreen('stats')} style={{ background: 'none', border: 'none', color: '#C9A227', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>My Stats</button>
                {isCoach && <button onClick={() => setScreen('coach')} style={{ background: 'none', border: 'none', color: '#20B2AA', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>My Roster</button>}
                {isAdmin && <button onClick={() => setScreen('admin')} style={{ background: 'none', border: 'none', color: '#f5c518', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Admin</button>}
                <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#4a4d60', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Sign Out</button>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '12px 16px', margin: '16px auto', maxWidth: 800, fontSize: 14, color: '#e74c3c' }}>{error}</div>
        )}
        <HomeScreen onStart={handleStart} />
      </>
    );
  }

  // ─── TOSSUP ──────────────────────────────────────────────────────
  if (screen === 'tossup' && queue[qIdx]) {
    return (
      <div style={S.wrap}>
        <div style={S.topBar}>
          <div style={S.topBarInner}>
            <span>{sessionTotal} pts</span>
            <span>{score.played} played · {score.powers} pow · {score.negs} neg</span>
            <button onClick={handleRestart} style={{ background: 'none', border: 'none', color: '#4a4d60', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Quit</button>
          </div>
        </div>
        <TossupPlayer key={qIdx} tossup={queue[qIdx]} onResult={handleTossupResult} questionNum={qIdx + 1} total={queue.length} defaultSpeed={filters?.speed ?? 120} />
      </div>
    );
  }

  // ─── BONUS ───────────────────────────────────────────────────────
  if (screen === 'bonus') {
    return (
      <div style={S.wrap}>
        <div style={S.topBar}>
          <div style={S.topBarInner}>
            <span>{sessionTotal} pts</span>
            <span>{score.played} played · {score.powers} pow · {score.negs} neg</span>
          </div>
        </div>
        <BonusPlayer bonus={currentBonus} tossupAnswer={lastTossupAnswer} onDone={handleBonusDone} />
      </div>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────
  if (screen === 'results') {
    const maxPossible = queue.length * 45;
    const pct = maxPossible > 0 ? Math.round((sessionTotal / maxPossible) * 100) : 0;
    return (
      <div style={S.wrap}>
        <div style={S.box}>
          <div style={{ textAlign: 'center', padding: '40px 0 28px' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: '#C9A227', lineHeight: 1 }}>{sessionTotal}</div>
            <div style={{ color: '#6b7084', fontSize: 14, marginTop: 8, letterSpacing: 2, textTransform: 'uppercase' }}>total points</div>
          </div>
          <div style={S.card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                { label: 'Tossup Pts', val: score.pts, color: '#C9A227' },
                { label: 'Bonus Pts', val: score.bonusPts, color: '#20B2AA' },
                { label: 'Powers', val: score.powers, color: '#f5c518' },
                { label: 'Negs', val: score.negs, color: '#c0392b' },
                { label: 'Questions', val: score.played, color: '#6b7084' },
                { label: 'Efficiency', val: `${pct}%`, color: '#6b7084' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '14px 8px', borderBottom: '1px solid #1e2030' }}>
                  <div style={{ fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <button style={S.btn()} onClick={() => filters && handleStart(filters)}>Practice Again</button>
            {user && <button style={S.btn('#20B2AA', true)} onClick={() => setScreen('stats')}>View Stats</button>}
            <button style={S.btn('#6b7084', true)} onClick={handleRestart}>Change Settings</button>
          </div>
          {!user && <p style={{ textAlign: 'center', fontSize: 12, color: '#4a4d60', marginTop: 16 }}>Sign in to save your progress and track stats over time.</p>}
        </div>
      </div>
    );
  }

  return null;
}
