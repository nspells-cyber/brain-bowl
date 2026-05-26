import { useState } from 'react';
import { CATEGORIES, DIFFICULTY_LABELS, HS_DIFFICULTIES } from '../utils/qbApi';

const SELECTABLE_DIFFICULTIES = [2, 3, 4, 5, 6].filter(d => d in DIFFICULTY_LABELS);

const S = {
  app: { minHeight: '100vh', background: '#0a0b0f', color: '#e8e6e1', fontFamily: "'Palatino Linotype','Book Antiqua',serif", padding: 0 },
  box: { maxWidth: 800, margin: '0 auto', padding: '24px 20px' },
  hdr: { textAlign: 'center', padding: '32px 0 16px', borderBottom: '1px solid #1e2030' },
  card: { background: '#12131a', border: '1px solid #1e2030', borderRadius: 8, padding: 24, marginBottom: 16 },
  h2: { color: '#C9A227', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 14px', fontWeight: 700 },
  pill: (active) => ({
    display: 'inline-block', padding: '6px 14px', margin: '4px', fontSize: 13,
    borderRadius: 20, cursor: 'pointer', border: `1px solid ${active ? '#C9A227' : '#2a2d40'}`,
    background: active ? '#C9A22722' : 'transparent', color: active ? '#C9A227' : '#6b7084',
    fontFamily: 'inherit', fontWeight: active ? 700 : 400,
  }),
  startBtn: (disabled) => ({
    display: 'block', width: '100%', padding: '16px', fontSize: 16, fontWeight: 700,
    background: disabled ? '#2a2d40' : '#C9A227', color: disabled ? '#4a4d60' : '#0a0b0f',
    border: 'none', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', letterSpacing: 2, textTransform: 'uppercase', marginTop: 8,
  }),
};

const SPEEDS = [
  { label: 'Slow', ms: 200 },
  { label: 'Normal', ms: 120 },
  { label: 'Fast', ms: 70 },
  { label: 'Very Fast', ms: 30 },
];

export default function HomeScreen({ onStart }) {
  const [categories, setCategories] = useState([]);
  const [difficulties, setDifficulties] = useState([...HS_DIFFICULTIES]);
  const [num, setNum] = useState(20);
  const [speed, setSpeed] = useState(120);

  const toggleCategory = (cat) =>
    setCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);

  const toggleDifficulty = (d) =>
    setDifficulties(p =>
      p.includes(d) ? p.filter(x => x !== d) : [...p, d].sort((a, b) => a - b)
    );

  const canStart = difficulties.length > 0;

  return (
    <div style={S.app}>
      <div style={S.box}>
        <div style={S.hdr}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#C9A227', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
            MHS Brain Bowl
          </h1>
          <p style={{ fontSize: 12, color: '#6b7084', marginTop: 8, letterSpacing: 3, textTransform: 'uppercase' }}>
            NAQT Pyramidal Practice · Live Packet Data
          </p>
        </div>

        <div style={{ ...S.card, marginTop: 24 }}>
          <h2 style={S.h2}>Categories <span style={{ color: '#4a4d60', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(all if none selected)</span></h2>
          <div>
            {CATEGORIES.map(cat => (
              <button key={cat} style={S.pill(categories.includes(cat))} onClick={() => toggleCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Difficulty</h2>
          <div>
            {SELECTABLE_DIFFICULTIES.map(d => (
              <button key={d} style={S.pill(difficulties.includes(d))} onClick={() => toggleDifficulty(d)}>
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          {difficulties.length === 0 && (
            <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>Select at least one difficulty level.</p>
          )}
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Reading speed</h2>
          <div>
            {SPEEDS.map(s => (
              <button key={s.ms} style={S.pill(speed === s.ms)} onClick={() => setSpeed(s.ms)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <h2 style={S.h2}>Questions per session: <span style={{ color: '#e8e6e1' }}>{num}</span></h2>
          <input
            type="range" min={5} max={40} step={5} value={num}
            onChange={e => setNum(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#C9A227' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4a4d60', marginTop: 4 }}>
            <span>5</span><span>40</span>
          </div>
        </div>

        <button
          style={S.startBtn(!canStart)}
          disabled={!canStart}
          onClick={() => onStart({ categories, difficulties, num, speed })}
        >
          Start Practice
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#4a4d60', marginTop: 16 }}>
          Questions sourced live from qbreader.org · NAQT format
        </p>
      </div>
    </div>
  );
}
