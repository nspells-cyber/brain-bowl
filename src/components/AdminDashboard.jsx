import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ROLES = ['student', 'coach', 'admin'];

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 960, margin: '0 auto', padding: '24px 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  tab: (active) => ({
    padding: '9px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
    border: 'none', borderBottom: active ? '2px solid #C9A227' : '2px solid transparent',
    background: 'transparent', color: active ? '#C9A227' : '#4a4d60',
  }),
  btn: (c = '#C9A227', ghost = false) => ({
    padding: '6px 14px', fontSize: 11, fontWeight: 700,
    border: ghost ? `1px solid ${c}` : 'none',
    borderRadius: 4, background: ghost ? 'transparent' : c,
    color: ghost ? c : '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
  }),
  sel: { padding: '5px 8px', fontSize: 12, background: '#1a1b25', border: '1px solid #2a2d40', borderRadius: 4, color: '#e8e6e1', fontFamily: 'inherit' },
  err: { background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 },
  ok: { background: '#1a2e1a', border: '1px solid #27ae60', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#27ae60', marginBottom: 14 },
  statusBadge: (active) => ({
    fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
    background: active ? '#1a3a1a' : '#2a2d40', color: active ? '#27ae60' : '#6b7084',
    border: `1px solid ${active ? '#27ae60' : '#3a3d50'}`,
  }),
};

function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: assignments }] = await Promise.all([
        supabase.from('profiles').select('id, display_name, role').order('display_name'),
        supabase.from('coach_students').select('student_id, coach_id').eq('status', 'active'),
      ]);
      const assignMap = Object.fromEntries((assignments ?? []).map(a => [a.student_id, a.coach_id]));
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]));
      setUsers((profiles ?? []).map(p => ({
        ...p,
        coachId: assignMap[p.id] ?? null,
        coachName: assignMap[p.id] ? (profileMap[assignMap[p.id]] ?? '(unknown)') : null,
      })));
      setCoaches((profiles ?? []).filter(p => p.role === 'coach'));
    } finally { setLoading(false); }
  }

  async function updateRole(userId, newRole) {
    if (userId === currentUserId && newRole !== 'admin') {
      if (!window.confirm('This removes your own admin access. Proceed?')) return;
    }
    setMsg(null);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    loadAll();
  }

  async function assignCoach() {
    if (!selectedCoach || !assignTarget) return;
    const { error } = await supabase.from('coach_students').upsert(
      { coach_id: selectedCoach, student_id: assignTarget.id, assigned_by: currentUserId, status: 'active' },
      { onConflict: 'student_id' }
    );
    if (error) { setMsg({ type: 'err', text: error.message }); return; }
    setAssignTarget(null);
    setSelectedCoach('');
    loadAll();
  }

  async function removeAssignment(studentId) {
    await supabase.from('coach_students').update({ status: 'removed' }).eq('student_id', studentId);
    loadAll();
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#4a4d60', padding: 40 }}>Loading...</div>;

  return (
    <>
      {msg && <div style={msg.type === 'err' ? S.err : S.ok}>{msg.text}</div>}

      {assignTarget && (
        <div style={{ background: '#0d0e16', border: '1px solid #C9A227', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Assign <strong>{assignTarget.display_name}</strong> to a coach:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select style={S.sel} value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)}>
              <option value="">Select coach...</option>
              {coaches.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <button style={S.btn()} onClick={assignCoach} disabled={!selectedCoach}>Assign</button>
            <button style={S.btn('#6b7084', true)} onClick={() => { setAssignTarget(null); setSelectedCoach(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2a2d40' }}>
              {['Name', 'Role', 'Assigned Coach', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1e2030', background: i % 2 === 1 ? '#0f1018' : 'transparent' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.display_name ?? '(no name)'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <select style={S.sel} value={u.role ?? 'student'} onChange={e => updateRole(u.id, e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '10px 12px', color: '#6b7084' }}>
                  {u.coachName ?? <span style={{ color: '#2a2d40' }}>unassigned</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {u.role === 'student' && (
                      <button style={S.btn('#20B2AA', true)} onClick={() => { setAssignTarget(u); setSelectedCoach(u.coachId ?? ''); }}>
                        {u.coachId ? 'Reassign' : 'Assign Coach'}
                      </button>
                    )}
                    {u.coachId && (
                      <button style={S.btn('#c0392b', true)} onClick={() => removeAssignment(u.id)}>Unassign</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AssignmentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('coach_students')
        .select('id, coach_id, student_id, status, assigned_at')
        .order('assigned_at', { ascending: false });
      const ids = [...new Set([...(data ?? []).map(r => r.coach_id), ...(data ?? []).map(r => r.student_id)])];
      const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
      const pm = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]));
      setRows((data ?? []).map(r => ({ ...r, coachName: pm[r.coach_id] ?? r.coach_id, studentName: pm[r.student_id] ?? r.student_id })));
    } finally { setLoading(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#4a4d60', padding: 40 }}>Loading...</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #2a2d40' }}>
          {['Student', 'Coach', 'Status', 'Assigned'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={4} style={{ padding: 24, color: '#4a4d60', textAlign: 'center' }}>No assignments yet.</td></tr>
        )}
        {rows.map((r, i) => (
          <tr key={r.id} style={{ borderBottom: '1px solid #1e2030', background: i % 2 === 1 ? '#0f1018' : 'transparent' }}>
            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.studentName}</td>
            <td style={{ padding: '10px 12px', color: '#6b7084' }}>{r.coachName}</td>
            <td style={{ padding: '10px 12px' }}><span style={S.statusBadge(r.status === 'active')}>{r.status}</span></td>
            <td style={{ padding: '10px 12px', color: '#4a4d60' }}>{new Date(r.assigned_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActivityTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sessions } = await supabase
        .from('sessions')
        .select('user_id, pts, bonus_pts, played, completed_at')
        .gte('completed_at', since);
      const totalSessions = sessions?.length ?? 0;
      const totalQuestions = sessions?.reduce((a, s) => a + (s.played || 0), 0) ?? 0;
      const byStudent = {};
      for (const s of sessions ?? []) {
        if (!byStudent[s.user_id]) byStudent[s.user_id] = { sessions: 0, pts: 0 };
        byStudent[s.user_id].sessions++;
        byStudent[s.user_id].pts += (s.pts || 0) + (s.bonus_pts || 0);
      }
      const topIds = Object.keys(byStudent).sort((a, b) => byStudent[b].sessions - byStudent[a].sessions).slice(0, 10);
      const { data: profiles } = topIds.length ? await supabase.from('profiles').select('id, display_name').in('id', topIds) : { data: [] };
      const pm = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]));
      setStats({
        totalSessions,
        totalQuestions,
        uniqueStudents: Object.keys(byStudent).length,
        top: topIds.map(id => ({ id, name: pm[id] ?? '(unknown)', ...byStudent[id] })),
      });
    } finally { setLoading(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#4a4d60', padding: 40 }}>Loading...</div>;
  if (!stats) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Sessions (7 days)', val: stats.totalSessions, color: '#C9A227' },
          { label: 'Questions (7 days)', val: stats.totalQuestions, color: '#20B2AA' },
          { label: 'Active Students', val: stats.uniqueStudents, color: '#e8e6e1' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: '#0d0e16', border: '1px solid #1e2030', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>
      {stats.top.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#4a4d60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Most Active This Week</div>
          {stats.top.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid #1e2030', fontSize: 13 }}>
              <span style={{ color: '#2a2d40', width: 20, textAlign: 'right' }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: '#6b7084' }}>{s.sessions} session{s.sessions !== 1 ? 's' : ''}</span>
              <span style={{ color: '#C9A227', fontWeight: 700, minWidth: 60, textAlign: 'right' }}>{s.pts} pts</span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export default function AdminDashboard({ user, onBack }) {
  const [tab, setTab] = useState('users');

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A227', letterSpacing: 2, textTransform: 'uppercase' }}>Admin Panel</div>
          <button style={S.btn('#6b7084', true)} onClick={onBack}>Back</button>
        </div>

        <div style={{ borderBottom: '1px solid #1e2030', marginBottom: 20 }}>
          {['users', 'assignments', 'activity'].map(t => (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div style={S.card}>
          {tab === 'users' && <UsersTab currentUserId={user.id} />}
          {tab === 'assignments' && <AssignmentsTab />}
          {tab === 'activity' && <ActivityTab />}
        </div>
      </div>
    </div>
  );
}
