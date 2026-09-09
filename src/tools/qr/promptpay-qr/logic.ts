import generatePayload from 'promptpay-qr';

export type PromptPayTargetType = 'phone' | 'nationalId' | 'ewallet';

export function normalizeTarget(raw: string): { type: PromptPayTargetType; value: string } {
  if (!/^\+?[\d\s-]+$/.test(raw.trim()))
    throw new Error('เลขพร้อมเพย์ต้องมีเฉพาะตัวเลข ช่องว่าง หรือขีด และ +66 สำหรับเบอร์โทร');
  if (raw.trim().startsWith('+') && !/^\+66[\s\d-]+$/.test(raw.trim()))
    throw new Error('รองรับรหัสประเทศ +66 เท่านั้น');
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length === 11) digits = '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) return { type: 'phone', value: digits };
  if (digits.length === 13) return { type: 'nationalId', value: digits };
  if (digits.length === 15) return { type: 'ewallet', value: digits };
  throw new Error('กรุณากรอกเบอร์โทร 10 หลัก, เลขบัตรประชาชน 13 หลัก หรือ e-Wallet 15 หลัก');
}

/** คืน EMVCo payload สำหรับสร้าง QR PromptPay (amount ไม่ระบุ/0 = ให้ผู้จ่ายกรอกเอง) */
export function buildPromptPayPayload(target: string, amount?: number): string {
  const { value } = normalizeTarget(target);
  if (amount !== undefined && !(Number.isFinite(amount) && amount >= 0)) {
    throw new Error('จำนวนเงินต้องไม่ติดลบ');
  }
  if (amount !== undefined && amount > 0 && amount < 0.01) throw new Error('ยอดระบุจำนวนเงินต้องอย่างน้อย 0.01 บาท');
  const opts = amount && amount > 0 ? { amount: Math.round(amount * 100) / 100 } : {};
  return generatePayload(value, opts);
}
