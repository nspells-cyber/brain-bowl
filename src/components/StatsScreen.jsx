import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  h2: { color: '#C9A227', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px', fontWeight: 700 },
  btn: (c = '#6b7084') => ({ padding: '10px 20px', fontSize: 13, fontWeight: 700, border: `1px solid ${c}`, borderRadius: 6, background: 'transparent', color: c, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 }),
};


export default function StatsScreen({ user, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const { data: s } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10);
        setSessions(s ?? []);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const totalPlayed = sessions.reduce((a, s) => a + (s.played || 0), 0);
  const totalPts = sessions.reduce((a, s) => a + (s.pts || 0) + (s.bonus_pts || 0), 0);
  const totalPowers = sessions.reduce((a, s) => a + (s.powers || 0), 0);
  const totalNegs = sessions.reduce((a, s) => a + (s.negs || 0), 0);

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A227', letterSpacing: 2, textTransform: 'uppercase' }}>My Stats</div>
          <button style={S.btn()} onClick={onBack}>Back</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4a4d60', padding: 40 }}>Loading...</div>
        ) : sessions.length === 0 ? (
          <div style={S.card}>
            <p style={{ color: '#6b7084', margin: 0 }}>No sessions yet. Complete a practice to see your stats.</p>
          </div>
        ) : (
          <>
            <div style={S.card}>
              <div style={S.h2}>All-time totals</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
                {[
                  { label: 'Sessions', val: sessions.length },
                  { label: 'Questions', val: totalPlayed },
                  { label: 'Total Pts', val: totalPts, color: '#C9A227' },
                  { label: 'Powers', val: totalPowers, color: '#f5c518' },
                  { label: 'Negs', val: totalNegs, color: '#c0392b' },
                  { label: 'Power Rate', val: totalPlayed > 0 ? `${Math.round((totalPowers / totalPlayed) * 100)}%` : '—' },
                  { label: 'Neg Rate', val: totalPlayed > 0 ? `${Math.round((totalNegs / totalPlayed) * 100)}%` : '—' },
                ].map(({ label, val, color = '#e8e6e1' }) => (
                  <div key={label} style={{ padding: '12px 8px', borderBottom: '1px solid #1e2030' }}>
                    <div style={{ fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.h2}>Recent sessions</div>
              {sessions.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e2030', fontSize: 13 }}>
                  <span style={{ color: '#6b7084' }}>{new Date(s.completed_at).toLocaleDateString()}</span>
                  <span>{s.played} questions</span>
                  <span style={{ color: '#C9A227', fontWeight: 700 }}>{(s.pts || 0) + (s.bonus_pts || 0)} pts</span>
                  <span style={{ color: '#f5c518' }}>{s.powers || 0} pow</span>
                  <span style={{ color: '#c0392b' }}>{s.negs || 0} neg</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
