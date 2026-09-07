const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** อ่านกลุ่มไม่เกิน 6 หลัก (ไม่มีคำว่า "ล้าน") คืน '' ถ้าเป็นศูนย์ */
function readGroup(group: string): string {
  const value = Number(group);
  if (value === 0) return '';
  const digits = group.padStart(6, '0').split('').map(Number);
  let out = '';
  for (let i = 0; i < 6; i++) {
    const d = digits[i];
    const pos = 5 - i; // 0 = หน่วย, 1 = สิบ, ...
    if (d === 0) continue;
    if (pos === 0 && d === 1 && value > 1) out += 'เอ็ด';
    else if (pos === 1 && d === 1) out += 'สิบ';
    else if (pos === 1 && d === 2) out += 'ยี่สิบ';
    else out += DIGITS[d] + UNITS[pos];
  }
  return out;
}

/** อ่านจำนวนเต็มจาก string ตัวเลขล้วน (ยาวเท่าไรก็ได้) */
export function readInteger(digits: string): string {
  const s = digits.replace(/^0+/, '');
  if (s === '') return DIGITS[0];
  const groups: string[] = [];
  for (let end = s.length; end > 0; end -= 6) groups.unshift(s.slice(Math.max(0, end - 6), end));
  return groups
    .map((g, i) => {
      const words = readGroup(g);
      return words ? words + 'ล้าน'.repeat(groups.length - 1 - i) : '';
    })
    .join('');
}

const NUMBER_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/** แปลงจำนวนเงินเป็นคำอ่านภาษาไทย เช่น 1234.5 → หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์ */
export function bahtText(input: number | string): string {
  const raw = typeof input === 'number' ? input.toFixed(2) : input.replace(/[,\s]/g, '');
  const m = NUMBER_RE.exec(raw);
  if (!m) throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
  const [, sign, intPart, decPart = ''] = m;

  // ปัดสตางค์เป็น 2 ตำแหน่ง (ปัดครึ่งขึ้น) แล้วทดขึ้นบาทถ้าครบ 100
  let satang = Math.round(Number(`0.${decPart || '0'}`) * 100);
  let baht = BigInt(intPart);
  if (satang === 100) {
    baht += 1n;
    satang = 0;
  }

  const bahtStr = baht.toString();
  let out = '';
  if (baht > 0n || satang === 0) out += readInteger(bahtStr) + 'บาท';
  out += satang === 0 ? 'ถ้วน' : readGroup(String(satang)) + 'สตางค์';
  return (sign && (baht > 0n || satang > 0) ? 'ลบ' : '') + out;
}
