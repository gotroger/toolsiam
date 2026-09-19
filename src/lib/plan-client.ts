import { useSyncExternalStore } from 'react';
import { getMeApiUrl } from '@/lib/routes';
import type { Plan } from '@/lib/plan-limits';

/**
 * สถานะสมาชิกฝั่งเบราว์เซอร์ — module store ตัวเดียวทั้งหน้า
 *
 * - `unknown`   ยังไม่ได้ถาม (ค่าฝั่ง server และเฟรมแรก)
 * - `off`       ระบบสมาชิกปิดอยู่ (/api/me ตอบ 204) → ทำตัวเหมือนเว็บไม่มีระบบสมาชิก ไม่มีข้อเสนอ
 * - `anonymous` ยืนยันแล้วว่าไม่ได้ล็อกอิน (ไม่มี hint cookie หรือได้ 401)
 * - `error`     มี hint cookie แต่ถามไม่สำเร็จ (เครือข่ายพัง/หมดเวลา) — **อาจเป็นสมาชิกที่จ่ายแล้ว**
 *               จึงใช้ขีดจำกัดแบบฟรีไว้ก่อนเพื่อความปลอดภัย แต่ห้ามเสนอขายซ้ำกับคนที่อาจจ่ายไปแล้ว
 * - `signedIn`  ล็อกอินอยู่ พร้อมแพลนและวันหมดอายุ
 *
 * ยิง /api/me เฉพาะเมื่อมี cookie `ts_m=1` เท่านั้น — ผู้ใช้ทั่วไปที่ไม่เคยล็อกอิน
 * จะไม่มี request ใดออกจากหน้า static (สถาปัตยกรรม static-first ไม่เปลี่ยน)
 *
 * ใช้ useSyncExternalStore ไม่ใช่ useEffect+setState — ESLint ของโปรเจกต์ห้าม set-state-in-effect
 */
export type PlanStatus = 'unknown' | 'off' | 'anonymous' | 'error' | 'signedIn';

export interface PlanState {
  status: PlanStatus;
  plan: Plan;
  /** unix seconds */
  premiumUntil: number | null;
  expiringSoon: boolean;
  user: { displayName: string; email: string; avatarUrl: string | null } | null;
}

export const HINT_COOKIE_NAME = 'ts_m';
const FETCH_TIMEOUT_MS = 3000;

const initial: PlanState = { status: 'unknown', plan: 'free', premiumUntil: null, expiringSoon: false, user: null };
const anonymous: PlanState = { ...initial, status: 'anonymous' };
const failed: PlanState = { ...initial, status: 'error' };

let state: PlanState = initial;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: PlanState) {
  state = next;
  for (const l of listeners) l();
}

export function hasSessionHint(): boolean {
  try {
    return document.cookie.split(';').some((c) => c.trim() === `${HINT_COOKIE_NAME}=1`);
  } catch {
    return false;
  }
}

/** ยิง /api/me ครั้งเดียวต่อหน้า — ทุก island ที่ subscribe ใช้ผลร่วมกัน */
export function refreshPlan(): Promise<void> {
  if (!hasSessionHint()) {
    set(anonymous);
    return Promise.resolve();
  }
  inflight = (async () => {
    try {
      const res = await fetch(getMeApiUrl(), {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status === 204) return set({ ...initial, status: 'off' });
      // 401 = เซิร์ฟเวอร์ยืนยันว่าไม่มี session จริง (cookie ค้าง) · สถานะอื่นคือถามไม่สำเร็จ
      if (res.status === 401) return set(anonymous);
      if (!res.ok) return set(failed);
      const body = (await res.json()) as Omit<PlanState, 'status'>;
      set({
        status: 'signedIn',
        plan: body.plan === 'premium' ? 'premium' : 'free',
        premiumUntil: typeof body.premiumUntil === 'number' ? body.premiumUntil : null,
        expiringSoon: body.expiringSoon === true,
        user: body.user ?? null,
      });
    } catch {
      set(failed);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (state.status === 'unknown' && !inflight) void refreshPlan();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initial;

export function usePlan(): PlanState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** สำหรับเทสต์เท่านั้น — ตั้งสถานะตรง ๆ โดยไม่ยิงเครือข่าย */
export function __setPlanForTests(next: Partial<PlanState> | null) {
  inflight = null;
  set(next ? { ...initial, ...next } : initial);
}
