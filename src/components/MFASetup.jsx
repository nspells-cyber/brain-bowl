import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif", display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 32, width: '100%', maxWidth: 420, margin: '0 20px' },
  title: { fontSize: 18, fontWeight: 700, color: '#C9A227', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  sub: { fontSize: 13, color: '#6b7084', marginBottom: 20, lineHeight: 1.6 },
  qr: { display: 'block', margin: '0 auto 20px', borderRadius: 8, border: '4px solid #fff' },
  secret: { background: '#1a1b25', border: '1px solid #2a2d40', borderRadius: 6, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: '#C9A227', marginBottom: 20, wordBreak: 'break-all', letterSpacing: 1 },
  label: { display: 'block', fontSize: 11, color: '#6b7084', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  inp: { width: '100%', padding: '14px', fontSize: 28, fontFamily: 'monospace', letterSpacing: 8, textAlign: 'center', background: '#1a1b25', border: '2px solid #2a2d40', borderRadius: 6, color: '#e8e6e1', outline: 'none', boxSizing: 'border-box', marginBottom: 16 },
  btn: { width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 6, background: '#C9A227', color: '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1 },
  err: { background: '#2e1a1a', border: '1px solid #c0392b', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 },
};

export default function MFASetup() {
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'MHS Brain Bowl' }).then(async ({ data, error: e }) => {
      if (e) { setError(e.message); return; }
      setFactorId(data.id);
      setSecret(data.totp.secret);
      const url = await QRCode.toDataURL(data.totp.uri, { width: 200, margin: 1 });
      setQrUrl(url);
    });
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6 || !factorId) return;
    setError('');
    setLoading(true);
    try {
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId });
      const { error: e } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
      if (e) { setError('Invalid code — try again.'); setCode(''); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.title}>Set Up Two-Factor Auth</div>
        <div style={S.sub}>
          Coach accounts require an authenticator app (Google Authenticator, Authy, etc.).
          Scan the QR code below, then enter the 6-digit code to confirm.
        </div>

        {error && <div style={S.err}>{error}</div>}
        {qrUrl && <img src={qrUrl} alt="TOTP QR code" style={S.qr} width={200} height={200} />}

        {secret && (
          <>
            <div style={{ fontSize: 11, color: '#4a4d60', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Manual entry key</div>
            <div style={S.secret}>{secret}</div>
          </>
        )}

        <label style={S.label}>Verification code</label>
        <input
          style={S.inp}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="000000"
          inputMode="numeric"
          maxLength={6}
        />
        <button style={S.btn} onClick={handleVerify} disabled={code.length !== 6 || loading}>
          {loading ? 'Verifying...' : 'Activate 2FA'}
        </button>
      </div>
    </div>
  );
}
