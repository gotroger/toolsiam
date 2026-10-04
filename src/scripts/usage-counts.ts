import { fetchUsageSummary } from '@/lib/usage-client';
import { displayCount, formatUseCount, formatUseCountLong } from '@/lib/usage';

/**
 * เติมยอดใช้งานลงช่อง `[data-usage-slug]` ของหน้า HTML ล้วน (หน้าเครื่องมือและการ์ด static)
 *
 * ช่องที่มี `data-usage-managed` เป็นของ React (ToolSearch) ข้ามไปเสมอ — สองทางจึงไม่เขียนทับกัน
 * `data-usage-format="long"` = ข้อความยาวในหน้าเครื่องมือ และเปิด `[data-usage-note]` ที่ครอบอยู่
 * ใช้ข้อมูลก้อนเดียวกับ React (fetchUsageSummary ยิงครั้งเดียวต่อหน้า)
 */
export async function fillUsageCounts(root: ParentNode = document): Promise<void> {
  const slots = [...root.querySelectorAll<HTMLElement>('[data-usage-slug]:not([data-usage-managed])')];
  if (slots.length === 0) return;
  const summary = await fetchUsageSummary();
  for (const slot of slots) {
    const n = displayCount(summary, slot.dataset.usageSlug ?? '');
    if (n === null) continue;
    const long = slot.dataset.usageFormat === 'long';
    slot.textContent = long ? formatUseCountLong(n) : formatUseCount(n);
    if (long) slot.closest<HTMLElement>('[data-usage-note]')?.removeAttribute('hidden');
  }
}
