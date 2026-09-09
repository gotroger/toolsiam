export interface JsonError {
  message: string;
  line: number;
  column: number;
  position: number;
}
export type JsonResult = { ok: true; output: string } | { ok: false; error: JsonError };
export type Indent = 2 | 4 | 'tab';

function locate(input: string, position: number): { line: number; column: number } {
  const before = input.slice(0, position);
  const line = (before.match(/\n/g)?.length ?? 0) + 1;
  const column = position - (before.lastIndexOf('\n') + 1) + 1;
  return { line, column };
}

function parse(input: string): { ok: true; value: unknown } | { ok: false; error: JsonError } {
  if (!input.trim())
    return { ok: false, error: { message: 'ยังไม่ได้ใส่ข้อมูล JSON', line: 1, column: 1, position: 0 } };
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    const msg = (e as Error).message;
    // V8: "... in JSON at position 12 (line 3 column 1)" / Firefox: "... at line 3 column 1"
    const pos = /position (\d+)/.exec(msg);
    const lc = /line (\d+) column (\d+)/.exec(msg);
    let position = pos ? Number(pos[1]) : 0;
    const { line, column } = lc ? { line: Number(lc[1]), column: Number(lc[2]) } : locate(input, position);
    if (!pos && lc) {
      const lines = input.split('\n');
      position = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + column - 1;
    }
    return { ok: false, error: { message: msg, line, column, position } };
  }
}

/** เก็บ lexeme เดิมของทุกค่า รวมเลขใหญ่ เลขทศนิยม และคีย์ซ้ำ */
function tokens(input: string): string[] {
  return input.match(/"(?:[^"\\]|\\[\s\S])*"|[^\s{}[\],:]+|[{}[\],:]/g) ?? [];
}

export function formatJson(input: string, indent: Indent = 2): JsonResult {
  const r = parse(input);
  if (!r.ok) return r;
  const parts = tokens(input);
  const unit = indent === 'tab' ? '\t' : ' '.repeat(indent);
  let depth = 0;
  let output = '';
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    if (token === '{' || token === '[') {
      output += token;
      depth++;
      if (parts[i + 1] !== '}' && parts[i + 1] !== ']') output += '\n' + unit.repeat(depth);
    } else if (token === '}' || token === ']') {
      depth--;
      if (parts[i - 1] !== '{' && parts[i - 1] !== '[') output += '\n' + unit.repeat(depth);
      output += token;
    } else if (token === ',') output += ',\n' + unit.repeat(depth);
    else if (token === ':') output += ': ';
    else output += token;
  }
  return { ok: true, output };
}

export function minifyJson(input: string): JsonResult {
  const r = parse(input);
  if (!r.ok) return r;
  return { ok: true, output: tokens(input).join('') };
}
