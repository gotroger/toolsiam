import type { CategoryId, CategoryMeta, ToolMeta } from './types';
import { categories } from './categories';

export { categories };
export type { ToolMeta, CategoryMeta, CategoryId };

/** ลำดับในนี้ = ลำดับแสดงผลในหน้า /tools */
export const tools: ToolMeta[] = [];

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
