import { formatNumber } from './format';

/**
 * ตัวนับการใช้งานเครื่องมือ — ส่วนที่เป็นฟังก์ชันบริสุทธิ์ (spec 2026-09-10-usage-counter-design §4)
 *
 * ไม่แตะ DOM ไม่แตะเครือข่าย ใช้ได้ทั้งฝั่ง Worker (usage-worker.ts) และเบราว์เซอร์ (usage-client.ts)
 */
export type UsageKind = 'view' | 'use';

export interface UsageCount {
  /** ยอด `use` สะสมตั้งแต่เปิดระบบ — ตัวเลขที่แสดงให้ผู้ใช้เห็น */
  total: number;
  /** ยอด `use` ใน RECENT_DAYS วันล่าสุด (รวมวันนี้) — ตัวเลขที่ใช้จัดอันดับ */
  recent: number;
}

export interface UsageSummary {
  generatedAt: string;
  tools: Record<string, UsageCount>;
}

/** ต่ำกว่านี้ไม่แสดงตัวเลข — เลขหลักเดียวทำให้เครื่องมือดูร้างมากกว่าช่วยตัดสินใจ */
export const USE_DISPLAY_THRESHOLD = 50;
/** ต้องมีเครื่องมือผ่านเกณฑ์อย่างน้อยเท่านี้ ตัวเลือกเรียง "ยอดนิยม" จึงจะปรากฏ */
export const POPULAR_SORT_MIN_TOOLS = 5;
/** เดือนที่เริ่มนับ — ตัวเลขทุกตัวเริ่มจากศูนย์ ณ ตอนนั้น ไม่มีข้อมูลย้อนหลัง */
export const USAGE_SINCE_LABEL = 'ต.ค. 2569';
/** ช่วงที่ใช้จัดอันดับ — รวมวันนี้ */
export const RECENT_DAYS = 30;

export function isUsageKind(value: unknown): value is UsageKind {
  return value === 'view' || value === 'use';
}

/** ยอดที่ควรแสดงของเครื่องมือนี้ — null = ยังไม่ถึงเกณฑ์หรือไม่มีข้อมูล (ไม่แสดงอะไรเลย) */
export function displayCount(summary: UsageSummary | null, slug: string): number | null {
  const total = summary?.tools[slug]?.total ?? 0;
  return total >= USE_DISPLAY_THRESHOLD ? total : null;
}

/** ข้อความสั้นบนการ์ด */
export function formatUseCount(n: number): string {
  return `ใช้ไปแล้ว ${formatNumber(n)} ครั้ง`;
}

/** ข้อความในหน้าเครื่องมือ */
export function formatUseCountLong(n: number): string {
  return `มีคนใช้เครื่องมือนี้แล้ว ${formatNumber(n)} ครั้ง`;
}

/** ข้อมูลพอให้เรียง "ยอดนิยม" หรือยัง */
export function canSortByPopularity(summary: UsageSummary | null): boolean {
  if (!summary) return false;
  let qualified = 0;
  for (const count of Object.values(summary.tools)) {
    if (count.total >= USE_DISPLAY_THRESHOLD && ++qualified >= POPULAR_SORT_MIN_TOOLS) return true;
  }
  return false;
}

/**
 * เรียงตาม `recent` มากไปน้อย → เสมอกันใช้ `total` → เสมอกันอีกใช้ลำดับเดิมของ input
 * ไม่แก้ array เดิม · ลำดับเดิมเป็นตัวตัดสินสุดท้าย ผลเรียงจึงนิ่งไม่สลับไปมาระหว่าง render
 */
export function sortByPopularity<T extends { slug: string }>(tools: readonly T[], summary: UsageSummary | null): T[] {
  const count = (slug: string) => summary?.tools[slug] ?? { total: 0, recent: 0 };
  return tools
    .map((tool, index) => ({ tool, index, c: count(tool.slug) }))
    .sort((a, b) => b.c.recent - a.c.recent || b.c.total - a.c.total || a.index - b.index)
    .map((x) => x.tool);
}

/**
 * วันแรกของช่วง "ล่าสุด" — `today` คือ YYYY-MM-DD ตามเวลาไทย ได้วันที่ย้อนไป RECENT_DAYS − 1 วัน
 * คำนวณบน UTC ล้วนเพราะเป็นแค่เลขวันที่ ไม่ใช่เวลา จึงไม่โดน timezone ของเครื่องที่รัน
 */
export function recentSince(today: string, days = RECENT_DAYS): string {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - (days - 1))).toISOString().slice(0, 10);
}

/** ตรวจรูปร่างคำตอบของ GET /api/usage — ข้อมูลเพี้ยนให้ถือว่าไม่มี (null) ไม่ใช่โยน error ใส่หน้าเว็บ */
export function parseUsageSummary(value: unknown): UsageSummary | null {
  if (!value || typeof value !== 'object') return null;
  const { generatedAt, tools } = value as { generatedAt?: unknown; tools?: unknown };
  if (typeof generatedAt !== 'string' || !tools || typeof tools !== 'object') return null;
  const out: Record<string, UsageCount> = {};
  for (const [slug, raw] of Object.entries(tools as Record<string, unknown>)) {
    const { total, recent } = (raw ?? {}) as { total?: unknown; recent?: unknown };
    if (typeof total === 'number' && typeof recent === 'number') out[slug] = { total, recent };
  }
  return { generatedAt, tools: out };
}
