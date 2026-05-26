import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 860, margin: '0 auto', padding: '24px 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  h2: { color: '#C9A227', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px', fontWeight: 700 },
  btn: (c = '#C9A227', ghost = false) => ({
    padding: '8px 16px', fontSize: 12, fontWeight: 700,
    border: ghost ? `1px solid ${c}` : 'none',
    borderRadius: 6, background: ghost ? 'transparent' : c,
    color: ghost ? c : '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
  }),
  inp: { padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', background: '#1a1b25', border: '1px solid #2a2d40', borderRadius: 6, color: '#e8e6e1', outline: 'none' },
  head: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', gap: 0, padding: '8px 0', borderBottom: '1px solid #2a2d40' },
  row: (alt) => ({ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', gap: 0, padding: '12px 0', borderBottom: '1px solid #1e2030', alignItems: 'center', fontSize: 13, background: alt ? '#0f1018' : 'transparent' }),
  err: { background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 },
  ok: { background: '#1a2e1a', border: '1px solid #27ae60', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#27ae60', marginBottom: 14 },
};

async function callSendInvite(email, coachId, accessToken) {
  const res = await fetch('/.netlify/functions/send-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ email, coachId }),
  });
  return res.json();
}

export default function CoachDashboard({ user, onBack }) {
  const [students, setStudents] = useState([]);
  const [rosterEmails, setRosterEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [inviting, setInviting] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { load(); }, [user]);

  async function load() {
    setLoading(true);
    try {
      const [{ data: activeRows }, { data: roster }] = await Promise.all([
        supabase.from('coach_students').select('id, student_id').eq('coach_id', user.id).eq('status', 'active'),
        supabase.from('coach_roster_emails').select('id, email, created_at').eq('coach_id', user.id).order('created_at', { ascending: false }),
      ]);

      const activeIds = (activeRows ?? []).map(r => r.student_id);

      const [profilesRes, sessionsRes] = await Promise.all([
        activeIds.length ? supabase.from('profiles').select('id, display_name').in('id', activeIds) : { data: [] },
        activeIds.length ? supabase.from('sessions').select('user_id, pts, bonus_pts, played, completed_at').in('user_id', activeIds) : { data: [] },
      ]);

      const profileMap = Object.fromEntries((profilesRes.data ?? []).map(p => [p.id, p]));
      const sessionsByStudent = {};
      for (const s of sessionsRes.data ?? []) {
        if (!sessionsByStudent[s.user_id]) sessionsByStudent[s.user_id] = [];
        sessionsByStudent[s.user_id].push(s);
      }

      setStudents((activeRows ?? []).map(r => {
        const ss = sessionsByStudent[r.student_id] ?? [];
        const totalPts = ss.reduce((a, s) => a + (s.pts || 0) + (s.bonus_pts || 0), 0);
        const sorted = [...ss].sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
        return {
          assignmentId: r.id,
          studentId: r.student_id,
          displayName: profileMap[r.student_id]?.display_name ?? '(unnamed)',
          sessionCount: ss.length,
          totalPts,
          lastActive: sorted[0]?.completed_at ?? null,
        };
      }));

      setRosterEmails(roster ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { setMsg({ type: 'err', text: 'Enter a valid email address.' }); return; }
    setMsg(null);
    const { error } = await supabase.from('coach_roster_emails').insert({ coach_id: user.id, email });
    if (error) {
      setMsg({ type: 'err', text: error.code === '23505' ? 'That email is already on your roster.' : error.message });
      return;
    }
    setNewEmail('');
    load();
  }

  async function removeEmail(id) {
    await supabase.from('coach_roster_emails').delete().eq('id', id);
    load();
  }

  async function removeStudent(assignmentId) {
    await supabase.from('coach_students').update({ status: 'removed' }).eq('id', assignmentId);
    load();
  }

  async function handleSendInvite(email) {
    setInviting(email);
    setMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await callSendInvite(email, user.id, session.access_token);
      if (result.error) setMsg({ type: 'err', text: result.error });
      else setMsg({ type: 'ok', text: result.note ?? `Invite sent to ${email}` });
    } catch {
      setMsg({ type: 'err', text: 'Failed to send invite. Try again.' });
    } finally {
      setInviting(null);
    }
  }

  const registeredStudentIds = new Set(students.map(s => s.studentId));

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A227', letterSpacing: 2, textTransform: 'uppercase' }}>My Roster</div>
          <button style={S.btn('#6b7084', true)} onClick={onBack}>Back</button>
        </div>

        {msg && <div style={msg.type === 'err' ? S.err : S.ok}>{msg.text}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4a4d60', padding: 40 }}>Loading...</div>
        ) : (
          <>
            <div style={S.card}>
              <div style={S.h2}>Active Students ({students.length})</div>
              {students.length === 0 ? (
                <p style={{ color: '#6b7084', margin: 0, fontSize: 13 }}>
                  No active students yet. Add emails to your roster below — students are auto-assigned when they sign up with a matching address.
                </p>
              ) : (
                <>
                  <div style={S.head}>
                    {['Student', 'Sessions', 'Total Pts', 'Last Active', ''].map(h => (
                      <div key={h} style={{ fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</div>
                    ))}
                  </div>
                  {students.map((s, i) => (
                    <div key={s.assignmentId} style={S.row(i % 2 === 1)}>
                      <span style={{ fontWeight: 600 }}>{s.displayName}</span>
                      <span style={{ color: '#6b7084' }}>{s.sessionCount}</span>
                      <span style={{ color: '#C9A227', fontWeight: 700 }}>{s.totalPts}</span>
                      <span style={{ color: '#6b7084' }}>{s.lastActive ? new Date(s.lastActive).toLocaleDateString() : '—'}</span>
                      <button style={S.btn('#c0392b', true)} onClick={() => removeStudent(s.assignmentId)}>Remove</button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div style={S.card}>
              <div style={S.h2}>Roster Emails</div>
              <p style={{ color: '#6b7084', fontSize: 12, margin: '0 0 16px' }}>
                Students who sign up with these addresses are automatically assigned to you.
                Send an invite to students who haven't registered yet.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  style={{ ...S.inp, flex: 1 }}
                  type="email"
                  placeholder="student@school.edu"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEmail()}
                />
                <button style={S.btn()} onClick={addEmail}>Add to Roster</button>
              </div>

              {rosterEmails.length === 0 ? (
                <p style={{ color: '#4a4d60', fontSize: 13, margin: 0 }}>No emails on roster yet.</p>
              ) : (
                rosterEmails.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e2030', fontSize: 13 }}>
                    <span>
                      {r.email}
                      {registeredStudentIds.size > 0 && (
                        <span style={{ fontSize: 11, color: '#27ae60', marginLeft: 8 }}>
                          {/* We'd need to cross-ref email→student, but that requires fetching auth emails which isn't available client-side. Show roster only. */}
                        </span>
                      )}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        style={S.btn('#20B2AA', true)}
                        onClick={() => handleSendInvite(r.email)}
                        disabled={inviting === r.email}
                      >
                        {inviting === r.email ? 'Sending...' : 'Send Invite'}
                      </button>
                      <button style={S.btn('#c0392b', true)} onClick={() => removeEmail(r.id)}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
