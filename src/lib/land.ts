/**
 * หน่วยพื้นที่ที่ดินไทย (§10.2)
 *
 * ความสัมพันธ์เป็นค่าคงที่ตามมาตราชั่งตวงวัด ไม่ใช่อัตราที่เปลี่ยนตามเวลา
 * จึงไม่ต้องมี rates file และไม่ต้อง verify ซ้ำทุกปี
 *   1 ไร่ = 4 งาน = 400 ตารางวา = 1,600 ตารางเมตร
 *   1 ตารางวา = 4 ตารางเมตร
 */

export type LandUnit = 'rai' | 'ngan' | 'wa2' | 'm2' | 'hectare' | 'acre';

/** ตารางเมตรต่อ 1 หน่วย */
export const SQM_PER_UNIT: Record<LandUnit, number> = {
  rai: 1600,
  ngan: 400,
  wa2: 4,
  m2: 1,
  hectare: 10_000,
  // นิยามสากลของเอเคอร์ = 4,046.8564224 ตร.ม. พอดี
  acre: 4046.8564224,
};

export const UNIT_LABEL: Record<LandUnit, string> = {
  rai: 'ไร่',
  ngan: 'งาน',
  wa2: 'ตารางวา',
  m2: 'ตารางเมตร',
  hectare: 'เฮกตาร์',
  acre: 'เอเคอร์',
};

export interface RaiNganWa {
  rai: number;
  ngan: number;
  /** ตารางวา — มีทศนิยมได้ */
  wa2: number;
}

function assertArea(value: number): void {
  if (!Number.isFinite(value)) throw new Error('พื้นที่ต้องเป็นตัวเลข');
  if (value < 0) throw new Error('พื้นที่ต้องไม่ติดลบ');
}

export function toSquareMeters(value: number, unit: LandUnit): number {
  assertArea(value);
  return value * SQM_PER_UNIT[unit];
}

export function fromSquareMeters(sqm: number, unit: LandUnit): number {
  assertArea(sqm);
  return sqm / SQM_PER_UNIT[unit];
}

export function convertArea(value: number, from: LandUnit, to: LandUnit): number {
  return fromSquareMeters(toSquareMeters(value, from), to);
}

/**
 * แตกพื้นที่เป็น ไร่-งาน-ตารางวา แบบที่โฉนดเขียน
 *
 * ปัดเศษตารางวาเป็นทศนิยม 2 ตำแหน่งก่อน แล้วทดขึ้นถ้าเต็มหน่วย เพื่อไม่ให้ได้ผลอย่าง
 * "1 ไร่ 3 งาน 100.00 ตารางวา" ซึ่งควรเป็น "2 ไร่" พอดี
 */
export function toRaiNganWa(sqm: number): RaiNganWa {
  assertArea(sqm);
  const totalWa = sqm / SQM_PER_UNIT.wa2;

  let rai = Math.floor(totalWa / 400);
  let ngan = Math.floor((totalWa - rai * 400) / 100);
  let wa2 = Math.round((totalWa - rai * 400 - ngan * 100) * 100) / 100;

  if (wa2 >= 100) { wa2 -= 100; ngan += 1; }
  if (ngan >= 4) { ngan -= 4; rai += 1; }
  return { rai, ngan, wa2 };
}

export function fromRaiNganWa({ rai, ngan, wa2 }: RaiNganWa): number {
  assertArea(rai); assertArea(ngan); assertArea(wa2);
  return rai * SQM_PER_UNIT.rai + ngan * SQM_PER_UNIT.ngan + wa2 * SQM_PER_UNIT.wa2;
}

export interface LandPriceInput {
  /** พื้นที่ทั้งแปลง */
  area: number;
  areaUnit: LandUnit;
  /** ราคาต่อหนึ่งหน่วยของ priceUnit */
  pricePerUnit: number;
  priceUnit: LandUnit;
}

export interface LandPriceResult {
  totalPrice: number;
  areaSqm: number;
  pricePerRai: number;
  pricePerNgan: number;
  pricePerWa: number;
  pricePerSqm: number;
}

/** ราคารวมของแปลง พร้อมราคาต่อหน่วยทุกแบบเพื่อเทียบกับประกาศขายที่ใช้หน่วยต่างกัน */
export function landPrice(input: LandPriceInput): LandPriceResult {
  assertArea(input.area);
  if (!Number.isFinite(input.pricePerUnit) || input.pricePerUnit < 0) {
    throw new Error('ราคาต่อหน่วยต้องเป็นตัวเลขไม่ติดลบ');
  }
  const areaSqm = toSquareMeters(input.area, input.areaUnit);
  const pricePerSqm = input.pricePerUnit / SQM_PER_UNIT[input.priceUnit];
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    totalPrice: round2(areaSqm * pricePerSqm),
    areaSqm: round2(areaSqm),
    pricePerRai: round2(pricePerSqm * SQM_PER_UNIT.rai),
    pricePerNgan: round2(pricePerSqm * SQM_PER_UNIT.ngan),
    pricePerWa: round2(pricePerSqm * SQM_PER_UNIT.wa2),
    pricePerSqm: round2(pricePerSqm),
  };
}
