import { EXPIRING_SOON_DAYS, type Plan } from '@/lib/plan-limits';

/** เวลาทั้งระบบเป็น unix seconds */
export const DAY = 86_400;

/** พรีเมียม = วันหมดอายุยังไม่ถึง — คำนวณตอน request ไม่ต้องมี cron มาแก้ row */
export function planOf(expiresAt: number | null | undefined, now: number): Plan {
  return expiresAt != null && expiresAt > now ? 'premium' : 'free';
}

export function expiringSoon(expiresAt: number | null | undefined, now: number): boolean {
  return planOf(expiresAt, now) === 'premium' && (expiresAt as number) - now <= EXPIRING_SOON_DAYS * DAY;
}

/**
 * ต่ออายุ = บวกวันต่อจากวันหมดอายุเดิมถ้ายังไม่หมด ไม่ใช่นับใหม่จากวันนี้
 * ผู้ใช้ที่จ่ายล่วงหน้าจึงไม่เสียวันที่เหลือ (spec เดิม §3)
 */
export function extendExpiry(current: number | null | undefined, now: number, days: number): number {
  return Math.max(current ?? 0, now) + days * DAY;
}

/** วันที่เหลือ ปัดขึ้น — "เหลือ 1 วัน" ตอนเหลือ 2 ชั่วโมงตรงกับที่คนเข้าใจมากกว่า 0 วัน */
export function daysLeft(expiresAt: number, now: number): number {
  return Math.max(0, Math.ceil((expiresAt - now) / DAY));
}
