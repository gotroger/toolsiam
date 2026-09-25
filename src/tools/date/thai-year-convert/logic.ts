import { BE_OFFSET as OFFSET } from '@/lib/thai-date';
import { parseIsoDate } from '@/lib/date';

/**
 * คำศัพท์วันที่ภาษาไทยย้ายไปอยู่ที่ @/lib/thai-date เพื่อให้เครื่องมืออื่นใช้ร่วมกันได้
 * โดยไม่ต้อง import ข้ามโฟลเดอร์เครื่องมือ ไฟล์นี้คง re-export ไว้เพื่อความเข้ากันได้
 */
export {
  BE_OFFSET,
  THAI_MONTHS,
  THAI_MONTHS_SHORT,
  THAI_WEEKDAYS,
  THAI_DAY_COLORS,
  toBuddhistYear,
  toChristianYear,
  describeDate,
  formatThaiDate,
} from '@/lib/thai-date';

export type { ThaiDateInfo, FormatOptions } from '@/lib/thai-date';

/** ปี ค.ศ. แรกที่ปีใหม่ไทยเริ่ม 1 มกราคม (พ.ศ. 2484) */
export const THAI_NEW_YEAR_REFORM_CE = 1941;

/** ปีนี้ยังใช้ปีใหม่ 1 เมษายนอยู่ไหม — ใช้ตัดสินว่าต้องขึ้นหมายเหตุหรือไม่ */
export function isBeforeThaiNewYearReform(ce: number): boolean {
  return ce < THAI_NEW_YEAR_REFORM_CE;
}

/**
 * ปี พ.ศ. ตามที่เขียนในเอกสารสมัยนั้น — ใช้เฉพาะเครื่องมือนี้เท่านั้น
 *
 * ก่อน พ.ศ. 2484 ปีไทยขึ้นปีใหม่วันที่ 1 เมษายน วันที่ ม.ค.–มี.ค. จึงยังเป็นปี พ.ศ. ก่อนหน้า
 * (1 ก.พ. ค.ศ. 1930 = พ.ศ. 2472 ไม่ใช่ 2473) ส่วน พ.ศ. 2483 มีแค่ เม.ย.–ธ.ค. แล้วต่อด้วย 2484
 *
 * ไม่แก้ describeDate/toBuddhistYear กลาง เพราะเครื่องมืออื่น (อายุ ดวง หวย) ยึดสูตร 543 ตรง ๆ
 */
export function historicBuddhistYear(iso: string): number {
  parseIsoDate(iso);
  const ce = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return isBeforeThaiNewYearReform(ce) && month <= 3 ? ce + OFFSET - 1 : ce + OFFSET;
}
