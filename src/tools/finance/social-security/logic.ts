import {
  SECTION_33_RATES, SECTION_39, SECTION_40_EXTRA_SAVING_CAP, SECTION_40_OPTIONS,
  section33Contribution, section39Contribution, SOCIAL_SECURITY_SOURCE, wageCapAt,
  type Section33Result, type Section40Option,
} from '@/lib/rates/social-security';

export type { Section33Result, Section40Option };
export {
  SECTION_33_RATES, SECTION_39, SECTION_40_EXTRA_SAVING_CAP, SECTION_40_OPTIONS,
  section33Contribution, section39Contribution, SOCIAL_SECURITY_SOURCE, wageCapAt,
};

export type SsoSection = '33' | '39' | '40';

export const SECTION_LABEL: Record<SsoSection, string> = {
  '33': 'มาตรา 33 — ลูกจ้างในสถานประกอบการ',
  '39': 'มาตรา 39 — เคยเป็น ม.33 แล้วสมัครส่งต่อเอง',
  '40': 'มาตรา 40 — อาชีพอิสระ / แรงงานนอกระบบ',
};

export interface Section33Yearly extends Section33Result {
  employeeYearly: number;
  employerYearly: number;
  /** ยอดที่ผู้ประกันตนส่งทั้งปี ใช้เป็นค่าลดหย่อนภาษี (ยังไม่หนีบเพดานลดหย่อน) */
  deductibleYearly: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function section33Yearly(monthlyWage: number, asOf: string): Section33Yearly {
  const monthly = section33Contribution(monthlyWage, asOf);
  const employeeYearly = round2(monthly.employee * 12);
  return {
    ...monthly,
    employeeYearly,
    employerYearly: round2(monthly.employer * 12),
    deductibleYearly: employeeYearly,
  };
}

export interface Section40Result {
  option: Section40Option;
  /** ออมเพิ่มต่อเดือน (ทางเลือก 2 และ 3 เท่านั้น) */
  extraSaving: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

export function section40Total(optionNumber: 1 | 2 | 3, extraSaving: number): Section40Result {
  const option = SECTION_40_OPTIONS.find((o) => o.option === optionNumber);
  if (!option) throw new Error('ทางเลือกของมาตรา 40 ต้องเป็น 1, 2 หรือ 3');
  if (!Number.isFinite(extraSaving) || extraSaving < 0) throw new Error('เงินออมเพิ่มต้องเป็นตัวเลขไม่ติดลบ');
  if (extraSaving > SECTION_40_EXTRA_SAVING_CAP) {
    throw new Error(`เงินออมเพิ่มสูงสุด ${SECTION_40_EXTRA_SAVING_CAP.toLocaleString('en-US')} บาทต่อเดือน`);
  }
  // ทางเลือก 1 ไม่มีสิทธิประโยชน์ชราภาพ จึงออมเพิ่มไม่ได้
  const extra = optionNumber === 1 ? 0 : extraSaving;
  const monthlyTotal = round2(option.contribution + extra);

  return { option, extraSaving: extra, monthlyTotal, yearlyTotal: round2(monthlyTotal * 12) };
}
