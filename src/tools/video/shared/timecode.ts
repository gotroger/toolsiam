const ERROR = 'รูปแบบเวลาไม่ถูกต้อง ใช้ วินาที, นาที:วินาที หรือ ชั่วโมง:นาที:วินาที เช่น 90, 1:30, 0:01:30.5';

/** '1:30.5' → 90.5 · โยน Error ข้อความไทยเมื่ออ่านไม่ออก (ช่องนาที/วินาทีต้อง < 60 เมื่อมีช่องนำหน้า) */
export function parseTimecode(text: string): number {
  const parts = text.trim().split(':');
  if (parts.length > 3 || parts.some((p) => p === '')) throw new Error(ERROR);
  const last = parts[parts.length - 1];
  if (!/^\d+(\.\d+)?$/.test(last) || parts.slice(0, -1).some((p) => !/^\d+$/.test(p))) throw new Error(ERROR);
  const numbers = parts.map(Number);
  if (parts.length > 1 && numbers[numbers.length - 1] >= 60) throw new Error(ERROR);
  if (parts.length === 3 && numbers[1] >= 60) throw new Error(ERROR);
  return numbers.reduce((total, n) => total * 60 + n, 0);
}

/** 90.5 → '1:30.5' · แสดงทศนิยม 1 ตำแหน่งเฉพาะเมื่อไม่ลงตัว */
export function formatTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const frac = Math.floor((seconds - whole) * 10);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  return frac > 0 ? `${base}.${frac}` : base;
}
