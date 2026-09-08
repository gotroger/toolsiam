import {
  convertAll, formatRaiNganWa, fromSquareMeters, getAreaUnit, raiNganWaToSquareMeters, roundTo,
  squareMetersToRaiNganWa, toSquareMeters, type AreaUnit, type AreaUnitSpec, type RaiNganWa,
} from '@/lib/land';
import { formatNumber } from '@/lib/format';

export interface AreaConversion {
  squareMeters: number;
  /** ขนาดเดียวกันในรูปแบบที่เขียนในโฉนด */
  raiNganWa: RaiNganWa;
  /** ข้อความ "1 ไร่ 2 งาน 30 ตารางวา" */
  text: string;
  rows: { unit: AreaUnitSpec; value: number }[];
  /** บรรทัดเดียวพร้อมคัดลอกไปใช้ในเอกสาร */
  summary: string;
}

/** ขนาดที่ดินหนึ่งขนาด มองจากทุกหน่วยพร้อมกัน */
export function describeArea(squareMeters: number): AreaConversion {
  const raiNganWa = squareMetersToRaiNganWa(squareMeters);
  const text = formatRaiNganWa(raiNganWa);
  return {
    squareMeters: roundTo(squareMeters, 4),
    raiNganWa,
    text,
    rows: convertAll(squareMeters),
    summary: `${text} = ${formatNumber(roundTo(squareMeters, 2), 2)} ตารางเมตร`,
  };
}

export function fromRaiNganWa(area: RaiNganWa): AreaConversion {
  return describeArea(raiNganWaToSquareMeters(area));
}

export function fromUnit(value: number, unit: AreaUnit): AreaConversion {
  // เรียก getAreaUnit ก่อน เพื่อให้หน่วยที่ไม่รู้จักดังทันทีพร้อมชื่อหน่วยในข้อความ
  getAreaUnit(unit);
  return describeArea(toSquareMeters(value, unit));
}

/** ค่าของขนาดนี้ในหน่วยเดียวที่ระบุ ปัดตามความละเอียดของหน่วยนั้น */
export function valueIn(squareMeters: number, unit: AreaUnit): number {
  return roundTo(fromSquareMeters(squareMeters, unit), getAreaUnit(unit).digits);
}
