const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** อ่านกลุ่มไม่เกิน 6 หลัก (ไม่มีคำว่า "ล้าน") คืน '' ถ้าเป็นศูนย์
 *  hasHigherGroups: true เมื่อมีกลุ่ม "ล้าน" ที่สูงกว่าอยู่ก่อนหน้า (เช่น 1,000,001 → "...เอ็ด" ไม่ใช่ "...หนึ่ง") */
function readGroup(group: string, hasHigherGroups = false): string {
  const value = Number(group);
  if (value === 0) return '';
  const digits = group.padStart(6, '0').split('').map(Number);
  let out = '';
  for (let i = 0; i < 6; i++) {
    const d = digits[i];
    const pos = 5 - i; // 0 = หน่วย, 1 = สิบ, ...
    if (d === 0) continue;
    if (pos === 0 && d === 1 && (value > 1 || hasHigherGroups)) out += 'เอ็ด';
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
      const words = readGroup(g, i > 0);
      return words ? words + 'ล้าน'.repeat(groups.length - 1 - i) : '';
    })
    .join('');
}

const NUMBER_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/**
 * number → สตริงทศนิยมธรรมดา (ไม่มีรูปเลขยกกำลัง) เพื่อให้ผ่านเส้นทางเดียวกับข้อความที่ผู้ใช้พิมพ์
 *
 * ไม่ใช้ toFixed(2) เพราะปัดตามค่า float จริง (1.005 เก็บเป็น 1.00499… จึงได้ "1.00")
 * ขณะที่ String(n) ให้ตัวเลขสั้นที่สุดที่แทนค่านั้น ("1.005") ตรงกับที่คนพิมพ์
 * และ toFixed ใช้กับค่าตั้งแต่ 1e21 ไม่ได้ ส่วน String() ให้รูป "1e+21" จึงต้องกางออกเอง
 */
function numberToDecimalString(n: number): string {
  if (!Number.isFinite(n)) throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
  const str = String(n);
  const m = /^(-)?(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(str);
  if (!m) return str;
  const [, sign = '', intPart, fracPart = '', expText] = m;
  const exp = Number(expText);
  const digits = intPart + fracPart;
  // ตำแหน่งจุดทศนิยมใหม่นับจากซ้ายของ digits
  const point = intPart.length + exp;
  if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return sign + digits + '0'.repeat(point - digits.length);
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** แปลงจำนวนเงินเป็นคำอ่านภาษาไทย เช่น 1234.5 → หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์ */
export function bahtText(input: number | string): string {
  const raw = typeof input === 'number' ? numberToDecimalString(input) : input.replace(/[,\s]/g, '');
  const m = NUMBER_RE.exec(raw);
  if (!m) throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
  const [, sign, intPart, decPart = ''] = m;

  // ปัดสตางค์เป็น 2 ตำแหน่ง (ปัดครึ่งขึ้น) แล้วทดขึ้นบาทถ้าครบ 100
  // ใช้ string/integer half-up rounding แทน float เพื่อหลีกเลี่ยงปัญหา floating-point precision
  const padded = (decPart || '0').padEnd(3, '0').substring(0, 3);
  const firstTwo = parseInt(padded.substring(0, 2), 10) || 0; // ตัวเลข 2 หลักแรก
  const thirdDigit = parseInt(padded[2], 10); // ตัวเลขที่ 3
  let satang = firstTwo + (thirdDigit >= 5 ? 1 : 0); // half-up on 3rd digit
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
