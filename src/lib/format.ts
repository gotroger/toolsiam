const baht = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBaht(n: number): string {
  return baht.format(n);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

/** ขนาดไฟล์แบบอ่านง่าย ใช้ในรายการไฟล์ที่เลือกและในสรุปผลลัพธ์ */
export function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * แปลงข้อความจากช่องกรอกตัวเลขเป็น number
 *
 * ตัดคอมมาและช่องว่างที่ผู้ใช้ไทยพิมพ์ติดมา ส่วนช่องว่างเปล่าคืน NaN ไม่ใช่ 0
 * (`Number('')` ได้ 0 ทำให้ลบค่าทิ้งแล้วเครื่องมือคิดเป็นศูนย์เงียบ ๆ แทนที่จะเตือน)
 */
export function parseNumberInput(text: string): number {
  const cleaned = text.replace(/[,\s]/g, '');
  if (cleaned === '') return Number.NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}
