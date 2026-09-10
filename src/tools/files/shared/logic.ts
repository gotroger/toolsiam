export const MAX_PAGES = 150;
export const MAX_CELLS = 100_000;
export function pageIndices(input: string, count: number): number[] {
  if (!input.trim()) throw new Error('กรุณาระบุหมายเลขหน้า เช่น 1,3-5');
  const result = new Set<number>();
  for (const token of input.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('รูปแบบหน้าไม่ถูกต้อง ใช้ตัวเลขและช่วงหน้า เช่น 1,3-5');
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > count)
      throw new Error(`ระบุหน้าได้ตั้งแต่ 1 ถึง ${count} และช่วงหน้าต้องเรียงจากน้อยไปมาก`);
    for (let i = start; i <= end; i++) result.add(i - 1);
  }
  return [...result];
}
export function parseCsv(text: string, delimiter = ','): string[][] {
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim()) throw new Error('CSV ไม่มีข้อมูล');
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false,
    closed = false,
    cells = 0;
  const cell = () => {
    row.push(value);
    value = '';
    closed = false;
    if (++cells > MAX_CELLS) throw new Error('รองรับไม่เกิน 100,000 ช่องข้อมูล');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else value += c;
    } else if (c === delimiter) cell();
    else if (c === '\n' || c === '\r') {
      cell();
      rows.push(row);
      row = [];
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else if (c === '"' && !value && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error('CSV มีเครื่องหมายคำพูดไม่ถูกต้อง กรุณาตรวจไฟล์ต้นฉบับ');
      value += c;
    }
  }
  if (quoted) throw new Error('CSV มีเครื่องหมายคำพูดที่ยังไม่ปิด');
  if (value || row.length || closed) {
    cell();
    rows.push(row);
  }
  return rows;
}
export function toCsv(rows: string[][], delimiter = ','): string {
  // Neutralize spreadsheet formula injection when the downloaded CSV is opened in Excel.
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(delimiter),
      )
      .join('\r\n')
  );
}
export function dimensions(width: number, height: number, targetWidth?: number) {
  const w = targetWidth ?? width;
  const h = Math.max(1, Math.round((height * w) / width));
  if (
    !Number.isInteger(w) ||
    w < 1 ||
    (targetWidth !== undefined && w > 4096) ||
    w * h > 16_000_000 ||
    Math.max(w, h) > 16384
  )
    throw new Error('ขนาดรูปเกินกำหนด ใช้ความกว้าง 1–4096 พิกเซล และพื้นที่ไม่เกิน 16 ล้านพิกเซล');
  return { width: w, height: h };
}
