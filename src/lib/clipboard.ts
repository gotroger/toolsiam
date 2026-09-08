/**
 * คัดลอกข้อความลงคลิปบอร์ด — รวม logic ที่ copy-paste อยู่ใน Tool.tsx หลายตัว
 *
 * `navigator.clipboard` ต้องการ secure context และผู้ใช้บาง browser ปฏิเสธสิทธิ์
 * จึงคืนผลเป็น boolean แทนการโยน error ให้ทุกเครื่องมือต้อง try/catch เอง
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** ข้อความแจ้งเมื่อคัดลอกไม่สำเร็จ — ใช้ถ้อยคำเดียวกันทุกเครื่องมือ */
export const COPY_FAILED_MESSAGE = 'คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง';

/** ระยะเวลาแสดงสถานะ "คัดลอกแล้ว" (มิลลิวินาที) */
export const COPY_FEEDBACK_MS = 1500;

/** ประกอบ CSV จากหัวตารางและแถว — escape ตาม RFC 4180 (คอมมา, อัญประกาศ, ขึ้นบรรทัดใหม่) */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}
