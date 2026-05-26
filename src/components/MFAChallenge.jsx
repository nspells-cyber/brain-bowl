import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 32, width: '100%', maxWidth: 380, margin: '0 20px' },
  title: { fontSize: 18, fontWeight: 700, color: '#C9A227', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  sub: { fontSize: 13, color: '#6b7084', marginBottom: 24 },
  inp: { width: '100%', padding: '14px', fontSize: 28, fontFamily: 'monospace', letterSpacing: 8, textAlign: 'center', background: '#1a1b25', border: '2px solid #2a2d40', borderRadius: 6, color: '#e8e6e1', outline: 'none', boxSizing: 'border-box', marginBottom: 16 },
  btn: { width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, background: '#C9A227', color: '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 },
  err: { background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 },
};

export default function MFAChallenge({ factors }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeId, setChallengeId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    const factor = factors[0];
    supabase.auth.mfa.challenge({ factorId: factor.id }).then(({ data, error: e }) => {
      if (e) setError(e.message);
      else setChallengeId(data.id);
    });
  }, [factors]);

  const handleVerify = async () => {
    if (code.length !== 6 || !challengeId) return;
    setError('');
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.mfa.verify({
        factorId: factors[0].id,
        challengeId,
        code,
      });
      if (e) { setError('Invalid code. Try again.'); setCode(''); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.title}>Two-Factor Auth</div>
        <div style={S.sub}>Enter the 6-digit code from your authenticator app.</div>
        {error && <div style={S.err}>{error}</div>}
        <input
          ref={inputRef}
          style={S.inp}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
        />
        <button style={S.btn} onClick={handleVerify} disabled={code.length !== 6 || loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </div>
  );
}
