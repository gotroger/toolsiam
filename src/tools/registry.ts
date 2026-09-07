import type { CategoryId, CategoryMeta, ToolMeta } from './types';
import { categories } from './categories';
import { thaiIncomeTaxMeta } from './finance/thai-income-tax/meta';
import { loanInstallmentMeta } from './finance/loan-installment/meta';
import { bahtTextMeta } from './text/baht-text/meta';

export { categories };
export type { ToolMeta, CategoryMeta, CategoryId };

/** ลำดับในนี้ = ลำดับแสดงผลในหน้า /tools */
export const tools: ToolMeta[] = [thaiIncomeTaxMeta, loanInstallmentMeta, bahtTextMeta];

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
