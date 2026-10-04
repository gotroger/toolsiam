import { useSyncExternalStore } from 'react';
import { getUsageApiUrl } from './routes';
import { parseUsageSummary, type UsageKind, type UsageSummary } from './usage';

/**
 * ตัวนับการใช้งานฝั่งเบราว์เซอร์ (spec 2026-09-10-usage-counter-design §2, §4)
 *
 * - `recordUsage`        ยิง beacon หนึ่งครั้งต่อ (เครื่องมือ × ชนิด) ต่อเซสชันของแท็บ ล้มเหลวเงียบเสมอ
 * - `fetchUsageSummary`  ยิง GET ครั้งเดียวต่อหน้า ทุกไอส์แลนด์/สคริปต์ใช้ promise ร่วมกัน
 * - `useUsageSummary`    hook สำหรับ React — null จนกว่าจะได้ข้อมูล (และตลอดไปถ้าระบบปิดหรือพัง)
 *
 * การกันนับซ้ำอยู่ที่เบราว์เซอร์ จึงปลอมได้ ตัวเลขนี้เป็นตัวชี้วัดโดยประมาณ ไม่ใช่ตัวเลขที่ตรวจสอบย้อนได้
 */
const STORAGE_PREFIX = 'toolsiam-usage:';
const MARK: Record<UsageKind, string> = { view: 'v', use: 'u' };

function alreadySent(slug: string, kind: UsageKind): boolean {
  try {
    return (sessionStorage.getItem(STORAGE_PREFIX + slug) ?? '').includes(MARK[kind]);
  } catch {
    // ที่เก็บถูกปิด (private mode บางแบบ) — ถือว่ายังไม่เคยยิง
    return false;
  }
}

function markSent(slug: string, kind: UsageKind) {
  try {
    const key = STORAGE_PREFIX + slug;
    const current = sessionStorage.getItem(key) ?? '';
    if (!current.includes(MARK[kind])) sessionStorage.setItem(key, current + MARK[kind]);
  } catch {
    // เขียนไม่ได้ก็แค่อาจนับซ้ำในแท็บนี้ — ไม่กระทบการใช้เครื่องมือ
  }
}

export function recordUsage(slug: string, kind: UsageKind): void {
  if (alreadySent(slug, kind)) return;
  markSent(slug, kind);
  const body = JSON.stringify({ slug, kind });
  try {
    // sendBeacon ไม่หายเมื่อผู้ใช้ปิดแท็บทันที · คืน false เมื่อเบราว์เซอร์ไม่รับเข้าคิว → ถอยไป fetch
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(getUsageApiUrl(), body)) return;
    void fetch(getUsageApiUrl(), {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain' },
    }).catch(() => {});
  } catch {
    // ไม่มีทั้งสองทาง — ไม่เป็นไร
  }
}

let summary: UsageSummary | null = null;
let request: Promise<UsageSummary | null> | null = null;
const listeners = new Set<() => void>();

export function fetchUsageSummary(): Promise<UsageSummary | null> {
  request ??= (async () => {
    try {
      const res = await fetch(getUsageApiUrl(), { credentials: 'omit' });
      // 204 = ระบบปิดหรือไม่มี binding · สถานะอื่นที่ไม่ใช่ 200 = ขัดข้อง → ไม่แสดงตัวเลข
      if (res.status !== 200) return null;
      return parseUsageSummary(await res.json());
    } catch {
      return null;
    }
  })().then((result) => {
    summary = result;
    for (const l of listeners) l();
    return result;
  });
  return request;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void fetchUsageSummary();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => summary;
const getServerSnapshot = () => null;

export function useUsageSummary(): UsageSummary | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** สำหรับเทสต์เท่านั้น — ล้างสถานะระดับโมดูล หรือตั้งข้อมูลสรุปตรง ๆ โดยไม่ยิงเครือข่าย */
export function __setUsageSummaryForTests(next: UsageSummary | null, settled = true) {
  summary = next;
  request = settled ? Promise.resolve(next) : null;
  for (const l of listeners) l();
}
