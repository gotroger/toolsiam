import { useEffect, useSyncExternalStore } from 'react';
import { getFavoritesApiUrl } from './routes';
import { refreshPlan, usePlan, type PlanState } from './plan-client';

/**
 * รายการโปรดฝั่งเบราว์เซอร์ — module store ตัวเดียวทั้งหน้า แบบเดียวกับ plan-client.ts
 *
 * - `idle`    ยังไม่ได้โหลด (ไม่ได้ล็อกอิน หรือยังไม่รู้สถานะ)
 * - `loading` กำลังถาม GET /api/favorites
 * - `ready`   ได้รายการแล้ว
 * - `error`   โหลดไม่สำเร็จ — ปุ่มดาวไม่รู้สถานะจริง จึงไม่ให้กด (กดแล้วอาจลบของที่มีอยู่)
 *
 * โหลดเฉพาะเมื่อ usePlan() ยืนยันว่าล็อกอินอยู่ — คนทั่วไปจึงไม่มี request เพิ่ม
 * กดดาวแล้วเปลี่ยนบนจอทันที (optimistic) แล้วใช้ชุดที่ server ตอบกลับเป็นค่าจริง พลาดเมื่อไรคืนค่าเดิม
 */
export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface FavoritesState {
  status: FavoritesStatus;
  /** ใหม่ไปเก่า */
  slugs: readonly string[];
  /** slug ที่กำลังรอ server ตอบ — กดซ้ำระหว่างนี้ไม่มีผล */
  pending: readonly string[];
  /** ข้อความภาษาไทยของการกดครั้งล่าสุดที่ไม่สำเร็จ */
  error: string | null;
}

const initial: FavoritesState = { status: 'idle', slugs: [], pending: [], error: null };
let state: FavoritesState = initial;
const listeners = new Set<() => void>();

function set(patch: Partial<FavoritesState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function parseSlugs(body: unknown): string[] | null {
  const slugs = (body as { slugs?: unknown } | null)?.slugs;
  return Array.isArray(slugs) && slugs.every((s) => typeof s === 'string') ? slugs : null;
}

export async function loadFavorites(): Promise<void> {
  if (state.status === 'loading' || state.status === 'ready') return;
  set({ status: 'loading', error: null });
  try {
    const res = await fetch(getFavoritesApiUrl(), { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) {
      // session หายไประหว่างทาง — ให้ plan-client ยืนยันใหม่ ปุ่มจะกลายเป็นลิงก์เข้าสู่ระบบเอง
      set({ status: 'idle' });
      void refreshPlan();
      return;
    }
    const slugs = res.ok ? parseSlugs(await res.json()) : null;
    set(slugs ? { status: 'ready', slugs } : { status: 'error' });
  } catch {
    set({ status: 'error' });
  }
}

function apply(slugs: readonly string[], slug: string, favorite: boolean): string[] {
  const rest = slugs.filter((s) => s !== slug);
  return favorite ? [slug, ...rest] : rest;
}

export async function setFavorite(slug: string, favorite: boolean): Promise<void> {
  if (state.status !== 'ready' || state.pending.includes(slug)) return;
  set({ slugs: apply(state.slugs, slug, favorite), pending: [...state.pending, slug], error: null });
  const done = (patch: Partial<FavoritesState>) => set({ ...patch, pending: state.pending.filter((s) => s !== slug) });
  try {
    const res = await fetch(getFavoritesApiUrl(), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, favorite }),
    });
    if (res.status === 401) {
      done({ slugs: apply(state.slugs, slug, !favorite), error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
      void refreshPlan();
      return;
    }
    const slugs = res.ok ? parseSlugs(await res.json()) : null;
    if (!slugs) throw new Error('bad response');
    done({ slugs });
  } catch {
    // คืนเฉพาะ slug นี้ — ถ้ามีดาวตัวอื่นกดค้างอยู่พร้อมกัน ของตัวนั้นต้องไม่ถูกย้อนตามไปด้วย
    done({ slugs: apply(state.slugs, slug, !favorite), error: 'บันทึกรายการโปรดไม่สำเร็จ กรุณาลองใหม่' });
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface UseFavorites extends FavoritesState {
  plan: PlanState;
  isFavorite: (slug: string) => boolean;
  setFavorite: typeof setFavorite;
}

export function useFavorites(): UseFavorites {
  const plan = usePlan();
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
  // effect เรียก loader ของ store ภายนอก ไม่ได้ setState ของคอมโพเนนต์ — โหลดครั้งเดียวต่อหน้า
  useEffect(() => {
    if (plan.status === 'signedIn') void loadFavorites();
  }, [plan.status]);
  return { ...current, plan, isFavorite: (slug) => current.slugs.includes(slug), setFavorite };
}

/** สำหรับเทสต์เท่านั้น — ตั้งสถานะตรง ๆ โดยไม่ยิงเครือข่าย */
export function __setFavoritesForTests(next: Partial<FavoritesState> | null) {
  state = next ? { ...initial, ...next } : initial;
  for (const l of listeners) l();
}
