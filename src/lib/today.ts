/**
 * "วันนี้" ของ ToolSiam = วันที่ตามเวลาประเทศไทยเสมอ (§27 D2)
 *
 * `new Date().getFullYear()/getMonth()/getDate()` ใช้ timezone ของเครื่องผู้ใช้
 * คนไทยที่อยู่ลอนดอนเวลา 19:00 น. (= 01:00 น. ของวันถัดไปที่กรุงเทพฯ) จะเห็น
 * "วันนี้" เป็นวันก่อนหน้า → อายุ วันทำการ วันหยุด งวดหวย และดวงรายวันเพี้ยนไป 1 วัน
 *
 * `en-CA` คืนรูปแบบ YYYY-MM-DD อยู่แล้ว จึงไม่ต้องประกอบสตริงเอง
 */
const BANGKOK_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** วันที่ปัจจุบันตามเวลาไทยในรูป YYYY-MM-DD — รับเวลาอ้างอิงได้เพื่อให้ test deterministic (D4) */
export function todayInBangkok(now: Date = new Date()): string {
  return BANGKOK_DATE.format(now);
}
