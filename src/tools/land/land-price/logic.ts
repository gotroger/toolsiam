import { formatRaiNganWa, raiNganWaToSquareMeters, roundTo, type AreaUnit, type RaiNganWa } from '@/lib/land';
import { formatBaht } from '@/lib/format';

/** หน่วยที่คนไทยใช้ตั้งราคาที่ดิน */
export type PriceBasis = 'squareWa' | 'rai' | 'squareMeter';

export interface PriceBasisSpec {
  id: PriceBasis;
  /** ใช้เป็น label ของช่องกรอกและหัวตาราง */
  label: string;
  unit: AreaUnit;
}

export const PRICE_BASES: PriceBasisSpec[] = [
  { id: 'squareWa', label: 'ต่อตารางวา', unit: 'squareWa' },
  { id: 'rai', label: 'ต่อไร่', unit: 'rai' },
  { id: 'squareMeter', label: 'ต่อตารางเมตร', unit: 'squareMeter' },
];

const SQUARE_METERS: Record<PriceBasis, number> = { squareWa: 4, rai: 1600, squareMeter: 1 };

const round2 = (n: number) => roundTo(n, 2);

export interface LandPriceResult {
  squareMeters: number;
  area: RaiNganWa;
  /** "1 ไร่ 2 งาน 30 ตารางวา" */
  areaText: string;
  /** ราคารวมของที่ดินทั้งแปลง */
  total: number;
  /** ราคาต่อหน่วยครบทุกแบบ เรียงตาม PRICE_BASES */
  perUnit: { basis: PriceBasis; label: string; value: number }[];
  summary: string;
}

function assertArea(squareMeters: number): void {
  if (!(squareMeters > 0)) throw new Error('ขนาดที่ดินต้องมากกว่า 0');
}

function build(squareMeters: number, total: number, area: RaiNganWa): LandPriceResult {
  const areaText = formatRaiNganWa(area);
  const perUnit = PRICE_BASES.map((b) => ({
    basis: b.id,
    label: b.label,
    value: round2((total / squareMeters) * SQUARE_METERS[b.id]),
  }));
  return {
    squareMeters: roundTo(squareMeters, 4),
    area,
    areaText,
    total: round2(total),
    perUnit,
    summary: `${areaText} ราคารวม ${formatBaht(round2(total))} บาท`,
  };
}

/** รู้ราคาต่อหน่วย → หาราคารวม (กรณีที่คนถามกันมากที่สุด: "ตารางวาละเท่าไร") */
export function priceFromRate(area: RaiNganWa, rate: number, basis: PriceBasis): LandPriceResult {
  const squareMeters = raiNganWaToSquareMeters(area);
  assertArea(squareMeters);
  if (!Number.isFinite(rate) || rate < 0) throw new Error('ราคาต่อหน่วยต้องไม่ติดลบ');
  return build(squareMeters, (squareMeters / SQUARE_METERS[basis]) * rate, area);
}

/** รู้ราคารวมที่ประกาศขาย → หาว่าตกตารางวาละ/ไร่ละเท่าไร ไว้เทียบกับแปลงอื่น */
export function priceFromTotal(area: RaiNganWa, total: number): LandPriceResult {
  const squareMeters = raiNganWaToSquareMeters(area);
  assertArea(squareMeters);
  if (!Number.isFinite(total) || total < 0) throw new Error('ราคารวมต้องไม่ติดลบ');
  return build(squareMeters, total, area);
}
