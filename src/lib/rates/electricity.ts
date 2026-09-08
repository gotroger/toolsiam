import { parseIsoDate } from '@/lib/date';
import type { RateSource } from '@/tools/types';

/**
 * อัตราค่าไฟฟ้าบ้านอยู่อาศัย MEA และ PEA
 *
 * ⚠️ โครงสร้างอัตราเปลี่ยนใหม่ มีผลตั้งแต่ค่าไฟฟ้าประจำเดือน **กันยายน 2569**
 * ใช้อัตราตามเดือนที่ระบุในบิล; บิลก่อนกันยายนยังต้องใช้โครงสร้างเดิม
 *
 * โครงสร้างใหม่ทำให้ MEA และ PEA มีตัวเลขเท่ากันทุกช่อง ต่างกันเพียงระดับแรงดันที่ใช้แบ่งชั้น TOU
 * แต่ยังแยก key เป็น mea / pea ไว้ตั้งแต่แรก เพราะไม่มีอะไรรับประกันว่าจะเท่ากันตลอดไป
 */

export type Utility = 'mea' | 'pea';

export const UTILITY_LABEL: Record<Utility, string> = {
  mea: 'การไฟฟ้านครหลวง (MEA) — กรุงเทพฯ นนทบุรี สมุทรปราการ',
  pea: 'การไฟฟ้าส่วนภูมิภาค (PEA) — จังหวัดอื่นทั่วประเทศ',
};

export interface TariffStep {
  /** หน่วยสุดท้ายของขั้นนี้ (Infinity = ขั้นบนสุด) */
  upTo: number;
  /** บาทต่อหน่วย — ทศนิยม 4 ตำแหน่งตามประกาศ */
  ratePerUnit: number;
}

export interface ResidentialTariff {
  id: string;
  label: string;
  /** คำอธิบายว่าใครเข้าเงื่อนไขอัตรานี้ */
  eligibility: string;
  steps: TariffStep[];
  /** ค่าบริการรายเดือน (บาท) */
  serviceCharge: number;
}

/**
 * อัตราปกติของบ้านอยู่อาศัย
 *
 * ⚠️ การเลือกอัตรา 1.1 หรือ 1.2 มาจาก **ขนาดมิเตอร์และประวัติการใช้ไฟ 3 เดือน**
 * ไม่ใช่จากยอดหน่วยของเดือนนั้น — โค้ดจึงต้องให้ผู้ใช้เลือกเอง ห้ามเดาให้
 * และสังเกตว่าอัตรา 1.1 มีขั้นถึง 401 หน่วยขึ้นไปด้วย ไม่ได้จำกัดไว้แค่ 150 หน่วย
 */
const SMALL_STEPS: TariffStep[] = [
  { upTo: 15, ratePerUnit: 2.3488 },
  { upTo: 25, ratePerUnit: 2.9882 },
  { upTo: 200, ratePerUnit: 3.0 },
  { upTo: 400, ratePerUnit: 4.1584 },
  { upTo: Infinity, ratePerUnit: 4.3583 },
];

const LARGE_STEPS: TariffStep[] = [
  { upTo: 200, ratePerUnit: 3.0 },
  { upTo: 400, ratePerUnit: 4.1584 },
  { upTo: Infinity, ratePerUnit: 4.3583 },
];

const LEGACY_SMALL_STEPS: TariffStep[] = [
  { upTo: 15, ratePerUnit: 2.3488 },
  { upTo: 25, ratePerUnit: 2.9882 },
  { upTo: 35, ratePerUnit: 3.2405 },
  { upTo: 100, ratePerUnit: 3.6237 },
  { upTo: 150, ratePerUnit: 3.7171 },
  { upTo: 400, ratePerUnit: 4.2218 },
  { upTo: Infinity, ratePerUnit: 4.4217 },
];
const LEGACY_LARGE_STEPS: TariffStep[] = [
  { upTo: 150, ratePerUnit: 3.2484 },
  { upTo: 400, ratePerUnit: 4.2218 },
  { upTo: Infinity, ratePerUnit: 4.4217 },
];

function residentialTariffs(utility: Utility, legacy = false): ResidentialTariff[] {
  const meterNote =
    utility === 'mea'
      ? 'ติดตั้งเครื่องวัดไม่เกิน 5(15) แอมป์ 230 โวลต์ 1 เฟส 2 สาย'
      : 'ติดตั้งเครื่องวัดไม่เกิน 5 แอมป์ 220 โวลต์ 1 เฟส 2 สาย';
  return [
    {
      id: 'small',
      label: 'อัตราปกติ — ใช้ไฟไม่เกิน 150 หน่วย/เดือน',
      eligibility: `${meterNote} และใช้ไฟไม่เกิน 150 หน่วย/เดือน · ถ้าใช้เกิน 150 หน่วยติดต่อกัน 3 เดือน เดือนถัดไปจะย้ายไปอัตราถัดไป`,
      steps: legacy ? LEGACY_SMALL_STEPS : SMALL_STEPS,
      serviceCharge: 8.19,
    },
    {
      id: 'large',
      label: 'อัตราปกติ — ใช้ไฟเกิน 150 หน่วย/เดือน',
      eligibility:
        'ติดตั้งเครื่องวัดขนาดใหญ่กว่าเกณฑ์ข้างต้น หรือใช้ไฟเกิน 150 หน่วยติดต่อกัน 3 เดือน · เมื่อใช้ไม่เกิน 150 หน่วยติดต่อกัน 3 เดือน จะย้ายกลับอัตราแรก',
      steps: legacy ? LEGACY_LARGE_STEPS : LARGE_STEPS,
      serviceCharge: 24.62,
    },
  ];
}

export const RESIDENTIAL_TARIFFS: Record<Utility, ResidentialTariff[]> = {
  mea: residentialTariffs('mea'),
  pea: residentialTariffs('pea'),
};

/** Supported billing dates only; never apply the September revision to older bills. */
export function residentialTariffsAt(utility: Utility, asOf: string): ResidentialTariff[] | null {
  try {
    parseIsoDate(asOf);
  } catch {
    return null;
  }
  if (asOf < '2026-01-01' || asOf > '2026-12-31') return null;
  return asOf < '2026-09-01' ? residentialTariffs(utility, true) : RESIDENTIAL_TARIFFS[utility];
}

export interface FtPeriod {
  effectiveFrom: string;
  effectiveTo: string;
  label: string;
  /** บาทต่อหน่วย */
  ratePerUnit: number;
}

/**
 * ค่า Ft ปรับทุก 4 เดือน — ต้องมีคนตามอัปเดต (§16.3)
 * งวดถัดไปที่ต้องเติมคือ ม.ค.–เม.ย. 2570
 */
export const FT_PERIODS: FtPeriod[] = [
  { effectiveFrom: '2026-09-01', effectiveTo: '2026-12-31', label: 'ก.ย. – ธ.ค. 2569', ratePerUnit: 0.1623 },
  { effectiveFrom: '2026-05-01', effectiveTo: '2026-08-31', label: 'พ.ค. – ส.ค. 2569', ratePerUnit: 0.1623 },
  { effectiveFrom: '2026-01-01', effectiveTo: '2026-04-30', label: 'ม.ค. – เม.ย. 2569', ratePerUnit: 0.0972 },
];

/** ค่า Ft ที่ใช้กับบิลของวันที่กำหนด — null เมื่อยังไม่มีข้อมูลของงวดนั้น */
export function ftAt(asOf: string): FtPeriod | null {
  try {
    parseIsoDate(asOf);
  } catch {
    return null;
  }
  return FT_PERIODS.find((p) => p.effectiveFrom <= asOf && asOf <= p.effectiveTo) ?? null;
}

/** งวด Ft ล่าสุดที่มีข้อมูล — ใช้เป็นค่าตั้งต้นเมื่อวันปัจจุบันเลยงวดที่บันทึกไว้ */
export function latestFt(): FtPeriod {
  return FT_PERIODS.reduce((a, b) => (a.effectiveFrom >= b.effectiveFrom ? a : b));
}

/**
 * VAT ที่ใช้กับบิลค่าไฟ — เป็น **อัตราลด** ที่มีวันหมดอายุ ไม่ใช่ค่าคงที่
 *
 * ✅ verify เมื่อ 8 ก.ย. 2569 — ขยายถึง 30 ก.ย. 2570 แล้วจริง ไม่ใช่แค่ข่าว ครม.
 * พระราชกฤษฎีกาฯ (ฉบับที่ 807) ลงวันที่ 24 ส.ค. 2569 แก้ไขเพิ่มเติมฉบับที่ 646
 * ปรากฏในรายการ "กฎหมายออกใหม่" ของกรมสรรพากร https://www.rd.go.th/21221.html
 *
 * ⚠️ ต้องตรวจซ้ำต้นเดือน ต.ค. 2570 — อัตรานี้ถูกต่ออายุปีต่อปีมาตลอด ไม่เคยเป็นอัตราถาวร
 */
export const VAT = {
  rate: 0.07,
  effectiveTo: '2027-09-30',
} as const;

export interface BillStepLine {
  from: number;
  to: number;
  units: number;
  ratePerUnit: number;
  amount: number;
}

export interface BillResult {
  units: number;
  lines: BillStepLine[];
  /** ค่าพลังงานไฟฟ้าตามขั้นบันได */
  energyCharge: number;
  serviceCharge: number;
  ftCharge: number;
  /** ก่อน VAT */
  subtotal: number;
  vat: number;
  total: number;
  /** ค่าไฟเฉลี่ยต่อหน่วยรวมทุกอย่าง */
  averagePerUnit: number;
}

/**
 * ค่าไฟตามสูตรของการไฟฟ้า:
 *   ค่าพลังงานตามขั้นบันได + ค่าบริการรายเดือน + (Ft × จำนวนหน่วย) แล้วบวก VAT ทั้งก้อน
 *
 * คิดค่าพลังงานด้วยอัตรา 4 ตำแหน่ง แล้วปัดยอดค่าพลังงานและ Ft เป็นสตางค์
 * ก่อนรวมฐานภาษี จากนั้นปัด VAT และบวกยอดที่ปัดแล้วให้ตรงใบแจ้งค่าไฟ
 */
export function calculateBill(units: number, tariff: ResidentialTariff, ftRate: number, vatRate: number): BillResult {
  if (!Number.isFinite(units) || units < 0) throw new Error('จำนวนหน่วยต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(ftRate)) throw new Error('ค่า Ft ต้องเป็นตัวเลข');
  if (!Number.isFinite(vatRate) || vatRate < 0) throw new Error('อัตรา VAT ต้องเป็นตัวเลขไม่ติดลบ');
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const lines: BillStepLine[] = [];
  let prev = 0;
  let energy = 0;
  for (const step of tariff.steps) {
    if (units <= prev) break;
    const stepUnits = Math.min(units, step.upTo) - prev;
    const amount = stepUnits * step.ratePerUnit;
    lines.push({
      from: prev + 1,
      to: step.upTo,
      units: stepUnits,
      ratePerUnit: step.ratePerUnit,
      amount: round2(amount),
    });
    energy += amount;
    prev = step.upTo;
  }

  energy = round2(energy);
  const ft = round2(units * ftRate);
  const subtotal = round2(energy + tariff.serviceCharge + ft);
  const vat = round2(subtotal * vatRate);
  const total = round2(subtotal + vat);

  return {
    units,
    lines,
    energyCharge: round2(energy),
    serviceCharge: tariff.serviceCharge,
    ftCharge: round2(ft),
    subtotal: round2(subtotal),
    vat: round2(vat),
    total: round2(total),
    averagePerUnit: units === 0 ? 0 : round2(total / units),
  };
}

export const ELECTRICITY_SOURCES: RateSource[] = [
  {
    effectiveFrom: '2026-09-01',
    lastVerifiedAt: '2026-09-09',
    sourceName: 'PEA — อัตราใหม่เริ่มบิลกันยายน 2569',
    sourceUrl: 'https://www.pea.co.th/news/corporate-news/2392',
    summary: 'อัตราบ้านอยู่อาศัยใหม่เริ่มใช้กับค่าไฟฟ้าประจำเดือนกันยายน 2569 โดยเลือกตามเดือนที่ระบุในใบแจ้งค่าไฟ',
  },
  {
    effectiveFrom: '2023-05-01',
    lastVerifiedAt: '2026-09-09',
    sourceName: 'PEA — ตารางอัตราเดิมสำหรับบิลก่อนกันยายน 2569',
    sourceUrl: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf',
    summary:
      'ระบบรองรับบิลมกราคม–สิงหาคม 2569 ด้วยอัตราเดิม · บ้านอัตราเกิน 150 หน่วย: 150 หน่วยแรก 3.2484 · 151–400 หน่วย 4.2218 · เกิน 400 หน่วย 4.4217 บาท/หน่วย · ค่าบริการ 24.62 บาท',
  },
  {
    effectiveFrom: '2026-09-01',
    lastVerifiedAt: '2026-09-09',
    sourceName: 'การไฟฟ้านครหลวง (mea.or.th)',
    sourceUrl: 'https://www.mea.or.th/our-services/service-rates/other/D5xEaEwgU',
    summary:
      'อัตราค่าไฟฟ้าประเภทที่ 1 บ้านอยู่อาศัย เริ่มใช้ตั้งแต่ค่าไฟฟ้าประจำเดือนกันยายน 2569 · ไม่เกิน 150 หน่วย/เดือน ค่าบริการ 8.19 บาท · เกิน 150 หน่วย/เดือน ค่าบริการ 24.62 บาท · อัตราในตารางยังไม่รวม VAT',
  },
  {
    effectiveFrom: '2026-01-01',
    lastVerifiedAt: '2026-09-09',
    sourceName: 'การไฟฟ้าส่วนภูมิภาค — สถิติค่า Ft ปี 2569',
    sourceUrl: 'https://www.pea.co.th/our-services/tariff/ft-statistics',
    summary:
      'ค่า Ft มกราคม–เมษายน 2569 = 0.0972 บาท/หน่วย · พฤษภาคม–สิงหาคม และกันยายน–ธันวาคม 2569 = 0.1623 บาท/หน่วย · ยังไม่รวม VAT',
  },
];
