import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAnswer } from '../utils/qbApi';

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  tag: (c = '#C9A227') => ({ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 3, background: c + '22', color: c, textTransform: 'uppercase', letterSpacing: 1 }),
  btn: (c = '#C9A227', ghost = false) => ({
    padding: '12px 24px', fontSize: 14, fontWeight: 700,
    border: ghost ? `1px solid ${c}` : 'none',
    borderRadius: 6, background: ghost ? 'transparent' : c,
    color: ghost ? c : '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
  }),
  inp: {
    width: '100%', padding: '12px 16px', fontSize: 17, fontFamily: 'inherit',
    background: '#1a1b25', border: '2px solid #2a2d40', borderRadius: 6,
    color: '#e8e6e1', outline: 'none', boxSizing: 'border-box',
  },
};

function getParts(bonus) {
  if (!bonus || !Array.isArray(bonus.parts)) return [];
  return bonus.parts.map((p, i) => ({
    text: p.text ?? p.question ?? (typeof p === 'string' ? p : ''),
    answer: p.answer ?? (bonus.answers?.[i] ?? ''),
  }));
}

const BONUS_ADVANCE_DELAY_MS = 1600;

export default function BonusPlayer({ bonus, tossupAnswer, onDone }) {
  const parts = getParts(bonus);
  const [partIdx, setPartIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [results, setResults] = useState([]);
  const [checking, setChecking] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef(null);
  const doneTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(doneTimerRef.current), []);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    setAnswer('');
    setShowAnswer(false);
  }, [partIdx]);

  if (!bonus || parts.length === 0) {
    return (
      <div style={S.wrap}>
        <div style={S.box}>
          <div style={S.card}>
            <p style={{ color: '#6b7084' }}>No bonus available.</p>
            <button style={S.btn()} onClick={() => onDone({ bonusPts: 0, results: [] })}>Next Question</button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || checking) return;
    setChecking(true);
    try {
      const part = parts[partIdx];
      const j = await checkAnswer(part.answer, answer.trim());
      const correct = j.directive === 'accept';
      const newResults = [...results, { correct, answer: part.answer, given: answer.trim() }];
      setResults(newResults);
      setShowAnswer(true);
      if (partIdx >= parts.length - 1) {
        doneTimerRef.current = setTimeout(() => {
          onDone({ bonusPts: newResults.filter(r => r.correct).length * 10, results: newResults });
        }, BONUS_ADVANCE_DELAY_MS);
      }
    } finally {
      setChecking(false);
    }
  }, [answer, checking, parts, partIdx, results, onDone]);

  const handleSkip = useCallback(() => {
    const part = parts[partIdx];
    const newResults = [...results, { correct: false, answer: part.answer, given: '' }];
    setResults(newResults);
    setShowAnswer(true);
    if (partIdx >= parts.length - 1) {
      doneTimerRef.current = setTimeout(() => {
        onDone({ bonusPts: newResults.filter(r => r.correct).length * 10, results: newResults });
      }, BONUS_ADVANCE_DELAY_MS);
    }
  }, [parts, partIdx, results, onDone]);

  const current = parts[partIdx];
  const totalPts = results.filter(r => r.correct).length * 10;

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, color: '#4a4d60', fontSize: 13 }}>
          <span>Bonus — Part {partIdx + 1} of {parts.length}</span>
          <span style={{ color: '#C9A227', fontWeight: 700 }}>{totalPts} pts</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {bonus.category && <span style={S.tag('#C9A227')}>{bonus.category}</span>}
          {bonus.subcategory && <span style={S.tag('#7f8c8d')}>{bonus.subcategory}</span>}
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {parts.map((_, i) => {
            const res = results[i];
            let bg = '#2a2d40';
            if (res) bg = res.correct ? '#27ae60' : '#c0392b';
            else if (i === partIdx) bg = '#C9A227';
            return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: bg }} />;
          })}
        </div>

        {bonus.leadin && (
          <div style={{ ...S.card, borderColor: '#2a2d40', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#6b7084', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Bonus leadin</div>
            <div style={{ fontSize: 15, lineHeight: 1.7, color: '#b0aead' }}>{bonus.leadin}</div>
            {tossupAnswer && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#4a4d60' }}>
                Tossup: <span style={{ color: '#C9A227' }}>{tossupAnswer}</span>
              </div>
            )}
          </div>
        )}

        <div style={S.card}>
          <div style={{ fontSize: 13, color: '#6b7084', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Part {partIdx + 1} — 10 pts
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.8, marginBottom: 16 }}>{current.text}</div>

          {!showAnswer ? (
            <>
              <input
                ref={inputRef}
                style={S.inp}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Your answer..."
                disabled={checking}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button style={S.btn()} onClick={handleSubmit} disabled={!answer.trim() || checking}>
                  {checking ? 'Checking...' : 'Submit'}
                </button>
                <button style={S.btn('#6b7084', true)} onClick={handleSkip}>Skip</button>
              </div>
            </>
          ) : (
            <div style={{
              padding: '14px 16px', borderRadius: 6,
              background: results[partIdx]?.correct ? '#1a2e1a' : '#2e1a1a',
              border: `1px solid ${results[partIdx]?.correct ? '#27ae60' : '#c0392b'}`,
            }}>
              <div style={{ fontSize: 12, color: '#6b7084', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Answer</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{current.answer}</div>
              {results[partIdx]?.correct
                ? <div style={{ marginTop: 6, color: '#27ae60', fontWeight: 700 }}>Correct! +10 pts</div>
                : <div style={{ marginTop: 6, color: '#c0392b' }}>Incorrect</div>
              }
              {partIdx < parts.length - 1 && (
                <button style={{ ...S.btn(), marginTop: 12 }} onClick={() => setPartIdx(p => p + 1)}>
                  Next Part
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
