export const PASTELS = ['lilac', 'mint', 'butter', 'peach', 'sky', 'rose'] as const;
export type Pastel = (typeof PASTELS)[number];

// Hand-picked so neighbouring notebooks never share a colour
const SUBJECT_TONES: Record<string, Pastel> = {
  Mathematics: 'butter',
  Science: 'mint',
  'Social Science': 'peach',
  English: 'sky',
  Hindi: 'rose',
  EVS: 'mint',
  'Environmental Studies': 'mint',
  Physics: 'sky',
  Chemistry: 'lilac',
  Biology: 'mint',
  Accountancy: 'butter',
  'Business Studies': 'peach',
  Economics: 'lilac',
  History: 'peach',
  Geography: 'mint',
  'Political Science': 'rose',
};

/** Stable pastel for any label, so a subject always gets the same notebook colour */
export function pastelFor(key: string | number): Pastel {
  const s = String(key);
  if (SUBJECT_TONES[s]) return SUBJECT_TONES[s];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PASTELS[h % PASTELS.length];
}

export function formatDate(d: string | number, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString('en-IN', opts);
}

export function daysUntil(d: string) {
  const target = new Date(`${d}T23:59:59`);
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name: string) {
  return name.split(' ')[0];
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** plural(1, 'day') → '1 day', plural(3, 'quiz', 'quizzes') → '3 quizzes' */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
