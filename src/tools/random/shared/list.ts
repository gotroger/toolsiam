/** แปลงข้อความหลายบรรทัดเป็นรายการ — ใช้ร่วมกันทุกเครื่องมือที่รับรายชื่อ */
export function parseList(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}
