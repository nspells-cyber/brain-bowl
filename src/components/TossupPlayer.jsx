import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { checkAnswer } from '../utils/qbApi';

function parseWords(question) {
  return question.split(/\s+/).filter(Boolean);
}

function findPowerIdx(words) {
  return words.findIndex(w => w.includes('(*)'));
}

const S = {
  wrap: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif" },
  box: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  tag: (c = '#C9A227') => ({ padding: '3px 10px', fontSize: 11, fontWeight: 700, borderRadius: 3, background: c + '22', color: c, textTransform: 'uppercase', letterSpacing: 1 }),
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  qtext: { fontSize: 18, lineHeight: 1.9, minHeight: 120 },
  btn: (c = '#C9A227', ghost = false) => ({
    padding: '12px 24px', fontSize: 14, fontWeight: 700,
    border: ghost ? `1px solid ${c}` : 'none',
    borderRadius: 6, background: ghost ? 'transparent' : c,
    color: ghost ? c : '#0a0b0f', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1,
  }),
  inp: {
    width: '100%', padding: '14px 16px', fontSize: 18, fontFamily: 'inherit',
    background: '#1a1b25', border: '2px solid #2a2d40', borderRadius: 6,
    color: '#e8e6e1', outline: 'none', boxSizing: 'border-box',
  },
  answerBox: (correct) => ({
    padding: '16px 20px', borderRadius: 6, marginTop: 12,
    background: correct ? '#1a2e1a' : '#2e1a1a',
    border: `1px solid ${correct ? '#27ae60' : '#c0392b'}`,
  }),
};

export default function TossupPlayer({ tossup, onResult, questionNum, total, defaultSpeed = 120 }) {
  const words = useMemo(() => parseWords(tossup.question_sanitized ?? tossup.question ?? ''), [tossup.question_sanitized, tossup.question]);
  const powerIdx = useMemo(() => findPowerIdx(words), [words]);

  const [revealed, setRevealed] = useState(0);
  const [phase, setPhase] = useState('reading');
  const [answer, setAnswer] = useState('');
  const [judgment, setJudgment] = useState(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(defaultSpeed);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const isPowered = powerIdx >= 0 && revealed <= powerIdx;

  useEffect(() => {
    if (phase !== 'reading' || paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setRevealed(r => {
        if (r >= words.length) { clearInterval(timerRef.current); return r; }
        return r + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [phase, paused, speed, words.length]);

  useEffect(() => {
    if (phase === 'buzzed' && inputRef.current) inputRef.current.focus();
  }, [phase]);

  const handleBuzz = useCallback(() => {
    if (phase !== 'reading') return;
    clearInterval(timerRef.current);
    setPhase('buzzed');
    setAnswer('');
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && phase === 'reading') { e.preventDefault(); handleBuzz(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, handleBuzz]);

  const handleSubmit = async () => {
    if (!answer.trim() || phase === 'judging') return;
    setPhase('judging');
    const j = await checkAnswer(tossup.answer, answer.trim());
    setJudgment(j);
    setPhase('judged');
    if (j.directive === 'accept') {
      setRevealed(words.length);
      onResult({ pts: isPowered ? 15 : 10, correct: true, power: isPowered, tossup });
    } else if (j.directive === 'reject') {
      setRevealed(words.length);
      onResult({ pts: -5, correct: false, power: false, tossup });
    }
  };

  const renderWords = () =>
    words.slice(0, revealed).map((w, i) => {
      if (w.includes('(*)')) {
        const clean = w.replace('(*)', '');
        return (
          <span key={i}>
            {clean && <span>{clean} </span>}
            <span style={{ color: '#f5c518', fontWeight: 900, fontSize: 13 }}>(★) </span>
          </span>
        );
      }
      return <span key={i}>{w} </span>;
    });

  const tossupPts = isPowered ? 15 : 10;

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, color: '#4a4d60', fontSize: 13 }}>
          <span>Question {questionNum} of {total}</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {isPowered && phase === 'reading' && (
              <span style={{ color: '#f5c518', fontWeight: 700 }}>Power zone</span>
            )}
            <select
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              style={{ background: '#12131a', border: '1px solid #1e2030', color: '#6b7084', fontSize: 12, padding: '4px 8px', borderRadius: 4 }}
            >
              <option value={200}>Slow</option>
              <option value={120}>Normal</option>
              <option value={70}>Fast</option>
              <option value={30}>Very Fast</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {tossup.category && <span style={S.tag('#C9A227')}>{tossup.category}</span>}
          {tossup.subcategory && <span style={S.tag('#7f8c8d')}>{tossup.subcategory}</span>}
          {tossup.setName && <span style={{ fontSize: 12, color: '#4a4d60', alignSelf: 'center' }}>{tossup.setName}</span>}
        </div>

        <div style={S.card}>
          <div style={S.qtext}>
            {renderWords()}
            {phase === 'reading' && revealed < words.length && (
              <span style={{ opacity: 0.3 }}>|</span>
            )}
          </div>
        </div>

        {phase === 'judged' && (
          <div style={S.answerBox(judgment?.directive === 'accept')}>
            <div style={{ fontSize: 12, color: '#6b7084', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Correct answer</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{tossup.answer}</div>
            {judgment?.directive === 'accept' && (
              <div style={{ marginTop: 8, color: '#27ae60', fontWeight: 700 }}>
                Correct! +{tossupPts} pts{tossupPts === 15 ? ' (POWER)' : ''}
              </div>
            )}
            {judgment?.directive === 'reject' && (
              <div style={{ marginTop: 8, color: '#c0392b', fontWeight: 700 }}>Wrong. -5 pts</div>
            )}
            {judgment?.directive === 'prompt' && (
              <div style={{ marginTop: 8, color: '#f39c12', fontWeight: 700 }}>
                Prompt: {judgment.directedPrompt || 'Be more specific'}
              </div>
            )}
          </div>
        )}

        {phase === 'reading' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button style={S.btn()} onClick={handleBuzz}>BUZZ (Space)</button>
            <button style={S.btn('#6b7084', true)} onClick={() => setPaused(p => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button style={S.btn('#6b7084', true)} onClick={() => {
              clearInterval(timerRef.current);
              setRevealed(words.length);
              onResult({ pts: 0, correct: false, power: false, tossup, skipped: true });
            }}>Skip</button>
          </div>
        )}

        {(phase === 'buzzed' || (phase === 'judged' && judgment?.directive === 'prompt')) && (
          <div style={S.card}>
            <div style={{ fontSize: 13, color: '#C9A227', marginBottom: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              {judgment?.directive === 'prompt'
                ? `Prompt — ${judgment.directedPrompt || 'be more specific'}`
                : 'Your answer:'}
            </div>
            <input
              ref={inputRef}
              style={S.inp}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type answer and press Enter..."
              disabled={phase === 'judging'}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button style={S.btn()} onClick={handleSubmit} disabled={!answer.trim() || phase === 'judging'}>
                {phase === 'judging' ? 'Checking...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
