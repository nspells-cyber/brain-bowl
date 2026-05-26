import { useState } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box: { width: '100%', maxWidth: 400, padding: '0 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 32 },
  title: { fontSize: 24, fontWeight: 700, color: '#C9A227', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 12, color: '#4a4d60', textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 28 },
  label: { display: 'block', fontSize: 11, color: '#6b7084', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  inp: { width: '100%', padding: '11px 14px', fontSize: 15, fontFamily: 'inherit', background: '#1a1b25', border: '2px solid #2a2d40', borderRadius: 6, color: '#e8e6e1', outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
  btn: (c = '#C9A227') => ({ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, background: c, color: c === '#C9A227' ? '#0a0b0f' : '#e8e6e1', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, marginBottom: 10 }),
  ghost: { width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: '1px solid #2a2d40', borderRadius: 6, background: 'transparent', color: '#6b7084', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1, marginBottom: 10 },
  err: { background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 },
  ok: { background: '#1a2e1a', border: '1px solid #27ae60', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#27ae60', marginBottom: 14 },
  divider: { textAlign: 'center', color: '#2a2d40', fontSize: 12, margin: '4px 0 10px', letterSpacing: 1 },
  toggle: { textAlign: 'center', fontSize: 13, color: '#4a4d60', marginTop: 16 },
  link: { color: '#C9A227', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13 },
};

export default function AuthGate({ onGuest }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!email.trim() || !password.trim()) { setError('Email and password required.'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) setError(e.message);
      } else {
        const { error: e } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() || email.split('@')[0] } },
        });
        if (e) setError(e.message);
        else setSuccess('Check your email to confirm your account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    const { data, error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (e) setError(e.message);
    else if (data?.url) window.location.href = data.url;
  };

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={S.card}>
          <div style={S.title}>MHS Brain Bowl</div>
          <div style={S.sub}>NAQT Pyramidal Practice</div>

          {error && <div style={S.err}>{error}</div>}
          {success && <div style={S.ok}>{success}</div>}

          {mode === 'signup' && (
            <>
              <label style={S.label}>Display name</label>
              <input style={S.inp} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </>
          )}

          <label style={S.label}>Email</label>
          <input style={S.inp} type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="you@school.edu" />

          <label style={S.label}>Password</label>
          <input style={S.inp} type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="••••••••" />

          <button style={S.btn()} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={S.divider}>— or —</div>
          <button style={S.ghost} onClick={handleGoogle}>Continue with Google</button>
          <button style={S.ghost} onClick={onGuest}>Continue as Guest</button>

          <div style={S.toggle}>
            {mode === 'signin'
              ? <><span>No account? </span><button style={S.link} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
              : <><span>Have an account? </span><button style={S.link} onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
