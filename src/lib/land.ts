/**
 * หน่วยพื้นที่ที่ดินไทยและการแปลงหน่วย (§4 หมวดที่ดิน)
 *
 * ทุกอย่างแปลงผ่าน "ตารางเมตร" เป็นหน่วยกลางหน่วยเดียว จึงไม่มีสูตรแปลงตรงระหว่าง
 * หน่วยคู่ใด ๆ ให้ผิดเพี้ยนกันเอง — เพิ่มหน่วยใหม่ = เพิ่มบรรทัดเดียวในตาราง AREA_UNITS
 *
 * มาตราไทยเป็นนิยามตายตัว ไม่ใช่ค่าประมาณ: 1 ตารางวา = 4 ตร.ม. · 1 งาน = 100 ตารางวา ·
 * 1 ไร่ = 4 งาน = 400 ตารางวา = 1,600 ตร.ม.
 */
export type AreaUnit = 'rai' | 'ngan' | 'squareWa' | 'squareMeter' | 'squareKilometer' | 'hectare' | 'acre';

export interface AreaUnitSpec {
  id: AreaUnit;
  name: string;
  /** หน่วยย่อที่ใช้ต่อท้ายตัวเลข */
  short: string;
  /** ขนาด 1 หน่วยนี้ คิดเป็นกี่ตารางเมตร */
  squareMeters: number;
  /** จำนวนทศนิยมที่เหมาะกับการแสดงผลของหน่วยนั้น */
  digits: number;
}

export const SQUARE_METERS_PER_WA = 4;
export const WA_PER_NGAN = 100;
export const NGAN_PER_RAI = 4;
export const SQUARE_METERS_PER_RAI = SQUARE_METERS_PER_WA * WA_PER_NGAN * NGAN_PER_RAI;

export const AREA_UNITS: AreaUnitSpec[] = [
  { id: 'rai', name: 'ไร่', short: 'ไร่', squareMeters: SQUARE_METERS_PER_RAI, digits: 4 },
  { id: 'ngan', name: 'งาน', short: 'งาน', squareMeters: SQUARE_METERS_PER_WA * WA_PER_NGAN, digits: 4 },
  { id: 'squareWa', name: 'ตารางวา', short: 'ตร.ว.', squareMeters: SQUARE_METERS_PER_WA, digits: 2 },
  { id: 'squareMeter', name: 'ตารางเมตร', short: 'ตร.ม.', squareMeters: 1, digits: 2 },
  { id: 'squareKilometer', name: 'ตารางกิโลเมตร', short: 'ตร.กม.', squareMeters: 1_000_000, digits: 6 },
  { id: 'hectare', name: 'เฮกตาร์', short: 'ha', squareMeters: 10_000, digits: 4 },
  // 1 เอเคอร์ = 4,046.8564224 ตร.ม. (นิยามจากหลาสากล จึงเป็นค่าตายตัว ไม่ใช่ค่าประมาณ)
  { id: 'acre', name: 'เอเคอร์', short: 'acre', squareMeters: 4046.8564224, digits: 4 },
];

const unitById = new Map<AreaUnit, AreaUnitSpec>(AREA_UNITS.map((u) => [u.id, u]));

export function getAreaUnit(id: AreaUnit): AreaUnitSpec {
  const unit = unitById.get(id);
  if (!unit) throw new Error(`ไม่รู้จักหน่วยพื้นที่: ${id}`);
  return unit;
}

function assertArea(value: number, label = 'พื้นที่'): void {
  if (!Number.isFinite(value)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  if (value < 0) throw new Error(`${label}ต้องไม่ติดลบ`);
}

/** ปัดทศนิยมแบบไม่ให้ 0.1 + 0.2 โผล่มาเป็น 0.30000000000000004 ในผลลัพธ์ */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function toSquareMeters(value: number, unit: AreaUnit): number {
  assertArea(value);
  return value * getAreaUnit(unit).squareMeters;
}

export function fromSquareMeters(squareMeters: number, unit: AreaUnit): number {
  assertArea(squareMeters);
  return squareMeters / getAreaUnit(unit).squareMeters;
}

/** ขนาดที่ดินแบบที่เขียนในโฉนด — ตารางวามีทศนิยมได้ */
export interface RaiNganWa {
  rai: number;
  ngan: number;
  wa: number;
}

export function raiNganWaToSquareMeters({ rai, ngan, wa }: RaiNganWa): number {
  assertArea(rai, 'ไร่');
  assertArea(ngan, 'งาน');
  assertArea(wa, 'ตารางวา');
  return (rai * NGAN_PER_RAI * WA_PER_NGAN + ngan * WA_PER_NGAN + wa) * SQUARE_METERS_PER_WA;
}

/**
 * แปลงตารางเมตรกลับเป็น ไร่-งาน-ตารางวา
 *
 * ปัดเศษตารางวาที่ทศนิยม 4 ตำแหน่งก่อนแล้วค่อยทดขึ้น เพื่อไม่ให้ค่าอย่าง 1,600 ตร.ม.
 * ที่ผ่านการหารมาแล้วกลายเป็น "0 ไร่ 3 งาน 99.999 ตารางวา"
 */
export function squareMetersToRaiNganWa(squareMeters: number): RaiNganWa {
  assertArea(squareMeters);
  const totalWa = roundTo(squareMeters / SQUARE_METERS_PER_WA, 4);

  let rai = Math.floor(totalWa / (NGAN_PER_RAI * WA_PER_NGAN));
  let ngan = Math.floor((totalWa - rai * NGAN_PER_RAI * WA_PER_NGAN) / WA_PER_NGAN);
  let wa = roundTo(totalWa - rai * NGAN_PER_RAI * WA_PER_NGAN - ngan * WA_PER_NGAN, 4);

  if (wa >= WA_PER_NGAN) { wa = roundTo(wa - WA_PER_NGAN, 4); ngan += 1; }
  if (ngan >= NGAN_PER_RAI) { ngan -= NGAN_PER_RAI; rai += 1; }

  return { rai, ngan, wa };
}

/** เขียนขนาดที่ดินเป็นข้อความแบบที่คนไทยพูด — ตัดหน่วยที่เป็นศูนย์ออก */
export function formatRaiNganWa(area: RaiNganWa): string {
  const parts: string[] = [];
  if (area.rai > 0) parts.push(`${area.rai} ไร่`);
  if (area.ngan > 0) parts.push(`${area.ngan} งาน`);
  if (area.wa > 0 || parts.length === 0) parts.push(`${roundTo(area.wa, 4)} ตารางวา`);
  return parts.join(' ');
}

/** ขนาดเดียวกันในทุกหน่วย เรียงตามลำดับใน AREA_UNITS */
export function convertAll(squareMeters: number): { unit: AreaUnitSpec; value: number }[] {
  assertArea(squareMeters);
  return AREA_UNITS.map((unit) => ({ unit, value: roundTo(fromSquareMeters(squareMeters, unit.id), unit.digits) }));
}
