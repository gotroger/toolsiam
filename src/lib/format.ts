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
