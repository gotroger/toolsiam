export interface LineOptions {
  trim: boolean;
  removeEmpty: boolean;
  unique: boolean;
  /** ใช้กับทั้ง unique และ sort */
  caseInsensitive: boolean;
  sort: 'none' | 'asc' | 'desc';
  reverse: boolean;
  addNumbers: boolean;
}

export interface LineResult {
  text: string;
  stats: { input: number; output: number; removed: number };
}

export const DEFAULT_LINE_OPTIONS: LineOptions = {
  trim: false,
  removeEmpty: false,
  unique: false,
  caseInsensitive: false,
  sort: 'none',
  reverse: false,
  addNumbers: false,
};

const collator = new Intl.Collator('th');

export function processLines(text: string, options: LineOptions): LineResult {
  if (text === '') return { text: '', stats: { input: 0, output: 0, removed: 0 } };

  let lines = text.split(/\r\n|\r|\n/);
  const input = lines.length;

  if (options.trim) lines = lines.map((l) => l.trim());
  if (options.removeEmpty) lines = lines.filter((l) => l.trim() !== '');

  if (options.unique) {
    const seen = new Set<string>();
    lines = lines.filter((l) => {
      const key = options.caseInsensitive ? l.toLowerCase() : l;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (options.sort !== 'none') {
    const dir = options.sort === 'asc' ? 1 : -1;
    lines = [...lines].sort((a, b) => {
      const x = options.caseInsensitive ? a.toLowerCase() : a;
      const y = options.caseInsensitive ? b.toLowerCase() : b;
      return dir * collator.compare(x, y);
    });
  }

  if (options.reverse) lines = [...lines].reverse();

  const output = lines.length;
  if (options.addNumbers) lines = lines.map((l, i) => `${i + 1}. ${l}`);

  return { text: lines.join('\n'), stats: { input, output, removed: input - output } };
}
