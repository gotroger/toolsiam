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
