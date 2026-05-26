const API = 'https://www.qbreader.org/api';

export const CATEGORIES = [
  'Literature', 'History', 'Science', 'Fine Arts',
  'Mythology', 'Philosophy', 'Religion', 'Geography',
  'Social Science', 'Current Events', 'Other Academic',
];

// NAQT IS HS difficulty range: 3=Regular HS, 4=Hard HS, 5=National HS
export const HS_DIFFICULTIES = [3, 4, 5];

export const DIFFICULTY_LABELS = {
  1: 'Middle School', 2: 'Easy HS', 3: 'Regular HS',
  4: 'Hard HS', 5: 'National HS',
  6: 'Easy College', 7: 'Regular College', 8: 'Hard College', 9: 'Open',
};

const FETCH_TIMEOUT_MS = 12000;

async function apiFetch(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) throw new Error(`qbreader ${res.status}: ${path}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

const VALID_DIRECTIVES = new Set(['accept', 'reject', 'prompt']);

function isValidTossup(t) {
  return t && typeof t.question === 'string' && t.question.length > 0
    && typeof t.answer === 'string' && t.answer.length > 0;
}

function isValidBonus(b) {
  return b && Array.isArray(b.parts) && b.parts.length > 0;
}

export async function fetchTossups({
  categories = [],
  difficulties = HS_DIFFICULTIES,
  num = 20,
} = {}) {
  const data = await apiFetch('random-tossup', {
    difficulties: difficulties.join(','),
    categories: categories.length ? categories.join(',') : undefined,
    number: num,
  });
  return (data.tossups ?? []).filter(isValidTossup);
}

export async function fetchRandomBonus({
  categories = [],
  difficulties = HS_DIFFICULTIES,
} = {}) {
  const data = await apiFetch('random-bonus', {
    difficulties: difficulties.join(','),
    categories: categories.length ? categories.join(',') : undefined,
    number: 1,
  });
  const bonus = data.bonuses?.[0] ?? null;
  return isValidBonus(bonus) ? bonus : null;
}

export async function checkAnswer(answerline, givenAnswer, strictness = 2) {
  try {
    const result = await apiFetch('check-answer', { answerline, givenAnswer, strictness });
    if (!VALID_DIRECTIVES.has(result.directive)) {
      return { directive: 'reject' };
    }
    return result;
  } catch {
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const a = clean(givenAnswer);
    const b = clean(answerline);
    return { directive: (b.includes(a) || a.includes(b)) ? 'accept' : 'reject' };
  }
}
