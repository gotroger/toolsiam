import type { CategoryId, CategoryMeta, ToolMeta } from './types';
import { categories } from './categories';
import { thaiIncomeTaxMeta } from './finance/thai-income-tax/meta';
import { loanInstallmentMeta } from './finance/loan-installment/meta';
import { netSalaryMeta } from './finance/net-salary/meta';
import { vatWhtMeta } from './finance/vat-wht/meta';
import { compoundInterestMeta } from './finance/compound-interest/meta';
import { bahtTextMeta } from './text/baht-text/meta';
import { wordCountMeta } from './text/word-count/meta';
import { thaiNumeralsMeta } from './text/thai-numerals/meta';
import { textLinesMeta } from './text/text-lines/meta';
import { thaiIdCheckMeta } from './text/thai-id-check/meta';
import { ageDaysMeta } from './date/age-days/meta';
import { thaiYearConvertMeta } from './date/thai-year-convert/meta';
import { thaiHolidaysMeta } from './date/thai-holidays/meta';
import { promptpayQrMeta } from './qr/promptpay-qr/meta';
import { qrGeneratorMeta } from './qr/qr-generator/meta';
import { qrReaderMeta } from './qr/qr-reader/meta';
import { jsonFormatterMeta } from './dev/json-formatter/meta';
import { dateAddMeta } from './date/date-add/meta';
import { workTenureMeta } from './finance/work-tenure/meta';
import { otCalculatorMeta } from './finance/ot-calculator/meta';
import { landUnitConvertMeta } from './land/land-unit-convert/meta';
import { landPriceMeta } from './land/land-price/meta';
import { fuelCostMeta } from './daily/fuel-cost/meta';
import { profitMarginMeta } from './business/profit-margin/meta';
import { sellingPriceMeta } from './business/selling-price/meta';
import { socialSecurityMeta } from './finance/social-security/meta';
import { severancePayMeta } from './finance/severance-pay/meta';
import { whtCalculatorMeta } from './finance/wht-calculator/meta';
import { homeLoanMeta } from './loan/home-loan/meta';
import { carLoanMeta } from './loan/car-loan/meta';
import { creditCardDebtMeta } from './loan/credit-card-debt/meta';
import { flatEffectiveRateMeta } from './loan/flat-effective-rate/meta';
import { electricityBillMeta } from './daily/electricity-bill/meta';
import { shopProfitMeta } from './business/shop-profit/meta';

export { categories };
export type { ToolMeta, CategoryMeta, CategoryId };

/** ลำดับในนี้ = ลำดับแสดงผลในหน้า /tools */
export const tools: ToolMeta[] = [
  thaiIncomeTaxMeta,
  loanInstallmentMeta,
  homeLoanMeta,
  carLoanMeta,
  creditCardDebtMeta,
  flatEffectiveRateMeta,
  netSalaryMeta,
  socialSecurityMeta,
  severancePayMeta,
  otCalculatorMeta,
  workTenureMeta,
  vatWhtMeta,
  whtCalculatorMeta,
  compoundInterestMeta,
  bahtTextMeta,
  wordCountMeta,
  thaiNumeralsMeta,
  textLinesMeta,
  thaiIdCheckMeta,
  ageDaysMeta,
  dateAddMeta,
  thaiYearConvertMeta,
  thaiHolidaysMeta,
  promptpayQrMeta,
  qrGeneratorMeta,
  qrReaderMeta,
  landUnitConvertMeta,
  landPriceMeta,
  profitMarginMeta,
  sellingPriceMeta,
  shopProfitMeta,
  electricityBillMeta,
  fuelCostMeta,
  jsonFormatterMeta,
];

export function getTool(slug: string): ToolMeta | undefined {
  return tools.find((t) => t.slug === slug);
}

/** เครื่องมือที่แสดงได้ทุกที่ (รายการ ค้นหา หน้าแรก related) — ตัดตัวที่ hidden ออก (§13.3) */
export function getVisibleTools(): ToolMeta[] {
  return tools.filter((t) => !t.hidden);
}

/** เครื่องมือในหมวด — เครื่องมือที่ category เป็น null หรือ hidden ไม่เข้าเงื่อนไขใด ๆ */
export function getToolsByCategory(id: CategoryId): ToolMeta[] {
  return tools.filter((t) => t.category === id && !t.hidden);
}

export function getCategory(id: CategoryId): CategoryMeta {
  const c = categories.find((c) => c.id === id);
  if (!c) throw new Error(`unknown category: ${id}`);
  return c;
}

/** หมวดที่เปิดใช้จริง เรียงตาม order — รวม vertical ที่มี landingPath (§8.4) */
export function getActiveCategories(): CategoryMeta[] {
  return categories.filter((c) => c.status === 'active').sort((a, b) => a.order - b.order);
}

/** หมวดที่มีหน้า /categories/<id> ของตัวเอง — vertical ใช้ landingPath จึงไม่อยู่ในนี้ (§8.3) */
export function getBrowsableCategories(): CategoryMeta[] {
  return getActiveCategories().filter((c) => !c.landingPath);
}

/** "เครื่องมือแนะนำ" ที่ทีมเลือกเอง ไม่ใช่ยอดนิยมจากข้อมูลจริง (§19) */
export function getFeaturedTools(n = 8): ToolMeta[] {
  return getVisibleTools()
    .filter((t) => t.featuredRank !== undefined)
    .sort((a, b) => b.featuredRank! - a.featuredRank!)
    .slice(0, n);
}

/** related ที่กำหนดมือมาก่อนเสมอ แล้วเติมด้วยเครื่องมือหมวดเดียวกัน (§13.4) */
export function getRelatedTools(tool: ToolMeta, n = 6): ToolMeta[] {
  const picked: ToolMeta[] = [];
  const seen = new Set([tool.slug]);
  const push = (t: ToolMeta | undefined) => {
    if (!t || t.hidden || seen.has(t.slug)) return;
    seen.add(t.slug);
    picked.push(t);
  };
  for (const slug of tool.related ?? []) push(getTool(slug));
  if (tool.category) for (const t of getToolsByCategory(tool.category)) push(t);
  return picked.slice(0, n);
}
