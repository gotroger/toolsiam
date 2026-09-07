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
import { promptpayQrMeta } from './qr/promptpay-qr/meta';
import { jsonFormatterMeta } from './dev/json-formatter/meta';

export { categories };
export type { ToolMeta, CategoryMeta, CategoryId };

/** ลำดับในนี้ = ลำดับแสดงผลในหน้า /tools */
export const tools: ToolMeta[] = [
  thaiIncomeTaxMeta,
  loanInstallmentMeta,
  netSalaryMeta,
  vatWhtMeta,
  compoundInterestMeta,
  bahtTextMeta,
  wordCountMeta,
  thaiNumeralsMeta,
  textLinesMeta,
  thaiIdCheckMeta,
  ageDaysMeta,
  thaiYearConvertMeta,
  promptpayQrMeta,
  jsonFormatterMeta,
];

export function getTool(slug: string): ToolMeta | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(id: CategoryId): ToolMeta[] {
  return tools.filter((t) => t.category === id);
}

export function getCategory(id: CategoryId): CategoryMeta {
  const c = categories.find((c) => c.id === id);
  if (!c) throw new Error(`unknown category: ${id}`);
  return c;
}
