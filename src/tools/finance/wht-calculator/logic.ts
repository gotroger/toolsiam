/**
 * ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.3 / ภ.ง.ด.53)
 *
 * แยกออกมาจากเครื่องมือ VAT เพราะเป็นคนละเรื่องกันและคนค้นคนละคำ:
 * VAT คือภาษีที่บวกเพิ่มจากราคา ส่วนหัก ณ ที่จ่ายคือเงินที่ผู้จ่ายหักไว้แล้วนำส่งสรรพากรแทนผู้รับ
 *
 * จุดที่ผิดกันบ่อยที่สุด: **หัก ณ ที่จ่ายคิดจากยอดก่อน VAT เสมอ** ไม่ใช่จากยอดที่รวม VAT แล้ว
 */

export interface WhtRateOption {
  rate: number;
  label: string;
  /** ตัวอย่างงานที่เข้าอัตรานี้ */
  examples: string;
}

export const WHT_RATE_OPTIONS: WhtRateOption[] = [
  { rate: 0.01, label: '1% — ค่าขนส่ง', examples: 'ค่าขนส่งสินค้าโดยผู้ประกอบการขนส่ง' },
  { rate: 0.02, label: '2% — ค่าโฆษณา', examples: 'ค่าโฆษณาผ่านเอเจนซี่หรือสื่อ' },
  { rate: 0.03, label: '3% — ค่าบริการ / รับจ้างทำของ', examples: 'ค่าจ้างทำของ ค่าบริการทั่วไป ค่าซ่อม ค่าที่ปรึกษา' },
  { rate: 0.05, label: '5% — ค่าเช่า', examples: 'ค่าเช่าอาคาร ที่ดิน ยานพาหนะ และทรัพย์สินอื่น' },
];

export type WhtMode = 'fromBase' | 'fromNet';

export interface WhtInput {
  amount: number;
  /** fromBase = ยอดที่กรอกคือยอดก่อนหัก · fromNet = ยอดที่กรอกคือยอดที่ได้รับจริงหลังหักแล้ว */
  mode: WhtMode;
  whtRate: number;
  /** อัตรา VAT ที่บวกเพิ่ม (0 = ไม่จด VAT) */
  vatRate: number;
}

export interface WhtResult {
  /** ค่าบริการก่อน VAT — เป็นฐานของการหัก ณ ที่จ่าย */
  base: number;
  vat: number;
  /** ยอดตามใบกำกับภาษี = base + vat */
  invoiceTotal: number;
  wht: number;
  /** ยอดที่ผู้รับได้รับจริง = invoiceTotal − wht */
  netReceived: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateWht(input: WhtInput): WhtResult {
  const { amount, mode, whtRate, vatRate } = input;
  if (!Number.isFinite(amount) || amount < 0) throw new Error('ยอดเงินต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(whtRate) || whtRate < 0 || whtRate >= 1) throw new Error('อัตราหัก ณ ที่จ่ายต้องอยู่ระหว่าง 0–100%');
  if (!Number.isFinite(vatRate) || vatRate < 0) throw new Error('อัตรา VAT ต้องเป็นตัวเลขไม่ติดลบ');

  // ยอดที่ได้รับจริง = base × (1 + vat − wht) → ถอดกลับหา base
  const factor = 1 + vatRate - whtRate;
  if (mode === 'fromNet' && factor <= 0) throw new Error('อัตราที่กรอกทำให้ยอดรับสุทธิเป็นศูนย์หรือติดลบ');

  const base = mode === 'fromBase' ? round2(amount) : round2(amount / factor);
  const vat = round2(base * vatRate);
  const wht = round2(base * whtRate);
  const invoiceTotal = round2(base + vat);

  return { base, vat, invoiceTotal, wht, netReceived: round2(invoiceTotal - wht) };
}
