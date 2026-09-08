import { convertArea, fromRaiNganWa, toRaiNganWa, UNIT_LABEL, type LandUnit, type RaiNganWa } from '@/lib/land';

export type { LandUnit, RaiNganWa };
export { UNIT_LABEL, toRaiNganWa, fromRaiNganWa };

export const UNIT_ORDER: LandUnit[] = ['rai', 'ngan', 'wa2', 'm2', 'hectare', 'acre'];

export interface ConversionRow {
  unit: LandUnit;
  label: string;
  value: number;
}

/** แปลงพื้นที่หนึ่งค่าไปทุกหน่วยพร้อมกัน เพื่อให้เทียบประกาศขายที่ใช้หน่วยต่างกันได้ในหน้าจอเดียว */
export function convertToAllUnits(value: number, from: LandUnit): ConversionRow[] {
  return UNIT_ORDER.map((unit) => ({
    unit,
    label: UNIT_LABEL[unit],
    value: convertArea(value, from, unit),
  }));
}
