import {
  calculateBill, ELECTRICITY_SOURCES, ftAt, FT_PERIODS, latestFt, RESIDENTIAL_TARIFFS, UTILITY_LABEL, VAT,
  type BillResult, type FtPeriod, type ResidentialTariff, type Utility,
} from '@/lib/rates/electricity';

export type { BillResult, FtPeriod, ResidentialTariff, Utility };
export { calculateBill, ELECTRICITY_SOURCES, ftAt, FT_PERIODS, latestFt, RESIDENTIAL_TARIFFS, UTILITY_LABEL, VAT };

export interface Appliance {
  id: string;
  name: string;
  /** กำลังไฟโดยประมาณ (วัตต์) */
  watts: number;
  /** ชั่วโมงใช้งานต่อวันที่พบบ่อย */
  hoursPerDay: number;
}

/**
 * เครื่องใช้ไฟฟ้าตัวอย่างสำหรับโหมด "คำนวณจากกำลังไฟ"
 *
 * เป็นค่าประมาณเพื่อให้ผู้ใช้เริ่มต้นได้ ไม่ใช่ข้อมูลจากผู้ผลิต — ทุกค่าปรับได้เอง
 * เครื่องปรับอากาศและตู้เย็นมีคอมเพรสเซอร์ที่ตัดต่อเป็นช่วง กำลังไฟเฉลี่ยจริงจึงต่ำกว่าที่ระบุข้างเครื่อง
 */
export const COMMON_APPLIANCES: Appliance[] = [
  { id: 'ac-12000', name: 'เครื่องปรับอากาศ 12,000 BTU', watts: 1_200, hoursPerDay: 8 },
  { id: 'fridge', name: 'ตู้เย็น 2 ประตู', watts: 120, hoursPerDay: 24 },
  { id: 'fan', name: 'พัดลมตั้งพื้น', watts: 55, hoursPerDay: 8 },
  { id: 'water-heater', name: 'เครื่องทำน้ำอุ่น', watts: 3_500, hoursPerDay: 0.5 },
  { id: 'washing-machine', name: 'เครื่องซักผ้า', watts: 500, hoursPerDay: 1 },
  { id: 'tv-43', name: 'ทีวี LED 43 นิ้ว', watts: 80, hoursPerDay: 5 },
  { id: 'rice-cooker', name: 'หม้อหุงข้าว', watts: 700, hoursPerDay: 1 },
  { id: 'microwave', name: 'ไมโครเวฟ', watts: 1_000, hoursPerDay: 0.5 },
  { id: 'computer', name: 'คอมพิวเตอร์ตั้งโต๊ะ', watts: 250, hoursPerDay: 6 },
  { id: 'iron', name: 'เตารีด', watts: 1_200, hoursPerDay: 0.5 },
];

/** หน่วยไฟ (kWh) ต่อเดือนของเครื่องใช้หนึ่งชิ้น */
export function unitsPerMonth(watts: number, hoursPerDay: number, daysPerMonth = 30): number {
  if (!Number.isFinite(watts) || watts < 0) throw new Error('กำลังไฟต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0 || hoursPerDay > 24) {
    throw new Error('ชั่วโมงใช้งานต่อวันต้องอยู่ระหว่าง 0–24');
  }
  if (!Number.isFinite(daysPerMonth) || daysPerMonth <= 0 || daysPerMonth > 31) {
    throw new Error('จำนวนวันต่อเดือนต้องอยู่ระหว่าง 1–31');
  }
  return Math.round(((watts / 1_000) * hoursPerDay * daysPerMonth) * 100) / 100;
}

export interface ApplianceUsage {
  appliance: Appliance;
  quantity: number;
  hoursPerDay: number;
}

/** รวมหน่วยไฟของเครื่องใช้หลายชิ้น */
export function totalUnits(usages: ApplianceUsage[], daysPerMonth = 30): number {
  const sum = usages.reduce((acc, u) => {
    if (!Number.isFinite(u.quantity) || u.quantity < 0) throw new Error('จำนวนเครื่องต้องเป็นตัวเลขไม่ติดลบ');
    return acc + unitsPerMonth(u.appliance.watts, u.hoursPerDay, daysPerMonth) * u.quantity;
  }, 0);
  return Math.round(sum * 100) / 100;
}
