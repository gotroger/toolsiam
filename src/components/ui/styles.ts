export const field =
  'product-field w-full border border-slate-300 px-3 py-2 text-base text-slate-900 ' +
  'transition-colors duration-150 placeholder:text-slate-500 hover:border-slate-400 ' +
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30 disabled:bg-slate-100';

/**
 * ช่องติ๊ก — คุมขนาด สี และวงโฟกัสจากที่เดียว
 *
 * ใช้ `accent-*` ไม่ใช่ `text-*` เพราะยังไม่ได้ลง @tailwindcss/forms — `text-brand-600`
 * บน checkbox ดิบไม่มีผลกับสีเครื่องหมายถูก ส่วน accent-color เบราว์เซอร์รองรับเองทุกตัว
 */
export const checkboxField =
  'size-4 shrink-0 accent-brand-600 focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-1';

/** แถวของช่องติ๊กพร้อมข้อความ — ให้ระยะห่างและสีข้อความตรงกันทุกเครื่องมือ */
export const checkboxRow = 'flex items-center gap-2 text-sm text-slate-700';

/**
 * ช่องกรอกขนาดย่อที่อยู่ในช่องตาราง — เตี้ยและแคบกว่า `field` เพราะต้องพอดีความสูงของแถว
 * ใช้วงโฟกัสชุดเดียวกับช่องปกติ เพื่อให้การไล่ Tab ทั้งหน้ารู้สึกเป็นเรื่องเดียวกัน
 */
export const cellField =
  'w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm ' +
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30';

/** ต่อคลาสโดยข้ามค่าที่เป็น undefined/false — ใช้ทุกไฟล์ใน ui/ */
export function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(' ');
}
