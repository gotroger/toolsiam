export const VAT_RATE = 0.07;

/** อัตราภาษีหัก ณ ที่จ่ายที่ใช้บ่อย (ภ.ง.ด.3/53) */
export const WHT_RATES: { rate: number; label: string }[] = [
  { rate: 0.01, label: 'ค่าขนส่ง 1%' },
  { rate: 0.02, label: 'ค่าโฆษณา 2%' },
  { rate: 0.03, label: 'ค่าบริการ/รับจ้างทำของ 3%' },
  { rate: 0.05, label: 'ค่าเช่า 5%' },
  { rate: 0.1, label: 'เงินปันผล 10%' },
  { rate: 0.15, label: 'ดอกเบี้ย 15%' },
];

export interface InvoiceInput {
  amount: number;
  /** add = ยอดที่กรอกยังไม่รวม VAT, extract = ยอดที่กรอกรวม VAT แล้ว */
  mode: 'add' | 'extract';
  vatRate: number;
  /** 0 = ไม่หัก */
  whtRate: number;
}

export interface InvoiceResult {
  /** ราคาก่อน VAT */
  base: number;
  vat: number;
  total: number;
  /** ภาษีหัก ณ ที่จ่าย (คิดจาก base) */
  wht: number;
  /** ยอดจ่ายจริง = total − wht */
  payable: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateInvoice(input: InvoiceInput): InvoiceResult {
  const { amount, mode, vatRate, whtRate } = input;
  if (!Number.isFinite(amount) || amount < 0) throw new Error('ยอดเงินต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(vatRate) || vatRate < 0) throw new Error('อัตรา VAT ไม่ถูกต้อง');
  if (!Number.isFinite(whtRate) || whtRate < 0) throw new Error('อัตราหัก ณ ที่จ่ายไม่ถูกต้อง');

  let base: number;
  let total: number;
  if (mode === 'add') {
    base = round2(amount);
    total = round2(base * (1 + vatRate));
  } else {
    total = round2(amount);
    base = round2(total / (1 + vatRate));
  }
  // คำนวณ vat จากส่วนต่าง เพื่อให้ base + vat = total เสมอแม้ปัดเศษแล้ว
  const vat = round2(total - base);
  const wht = round2(base * whtRate);

  return { base, vat, total, wht, payable: round2(total - wht) };
}
