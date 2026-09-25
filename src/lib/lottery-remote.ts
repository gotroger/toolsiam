import { useSyncExternalStore } from 'react';
import { validateDrawIssues, type LotteryDraw } from '@/data/lottery/schema';
import { shouldPreferRemote } from '@/lib/lottery-freshness';

/**
 * งวดล่าสุดจาก KV (`GET /api/lottery/latest`) ฝั่งเบราว์เซอร์ — module store ตัวเดียวทั้งหน้า
 *
 * ทุก island ในหน้าเดียวกัน (แถบแจ้ง ตัวตรวจหวย ตารางผล) ใช้ผลของคำขอเดียวกัน
 * จึงเห็นงวดเดียวกันเสมอ — เดิมแถบแจ้งเห็นงวดใหม่จาก KV แต่ตัวตรวจยังตรวจกับงวด static ที่ build ไว้
 * ผู้ที่ถูกรางวัลงวดวันนี้จึงได้คำตอบว่า "ไม่ถูกรางวัล"
 *
 * - เฟรมแรก (ทั้งฝั่ง server และตอน hydrate) = `idle` + ไม่มีข้อมูล → HTML ตรงกับที่ build ไว้เสมอ
 * - 204 / timeout / Worker ล่ม / ข้อมูลไม่ผ่าน validator → `done` + ไม่มีข้อมูล → ใช้ static ต่อเงียบ ๆ
 *
 * ใช้ useSyncExternalStore ไม่ใช่ useEffect+setState — ESLint ของโปรเจกต์ห้าม set-state-in-effect
 */
export interface RemoteDraw {
  draw: LotteryDraw;
  fetchedAt: string;
}

export interface RemoteState {
  /** idle = ยังไม่ได้ถาม · loading = กำลังถาม · done = ถามเสร็จแล้ว (ได้หรือไม่ได้ข้อมูลก็ตาม) */
  status: 'idle' | 'loading' | 'done';
  remote: RemoteDraw | null;
}

export const LATEST_API_URL = '/api/lottery/latest';
const TIMEOUT_MS = 3_000;

const initial: RemoteState = { status: 'idle', remote: null };
let state: RemoteState = initial;
const listeners = new Set<() => void>();

function set(next: RemoteState) {
  state = next;
  for (const l of listeners) l();
}

/** ข้อมูลจาก KV ต้องผ่าน validator ชุดเดียวกับ static อีกรอบ — KV ที่เสียหายต้องไม่ทำให้ตัวตรวจตอบผิด */
function parseRemote(data: unknown): RemoteDraw | null {
  const draw = (data as Partial<RemoteDraw> | null)?.draw;
  if (!draw || validateDrawIssues(draw).length > 0) return null;
  return { draw, fetchedAt: String((data as RemoteDraw).fetchedAt ?? '') };
}

function load() {
  set({ status: 'loading', remote: null });
  fetch(LATEST_API_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    .then((res) => (res.status === 200 ? res.json() : null))
    .then((data) => set({ status: 'done', remote: data ? parseRemote(data) : null }))
    // ทุกความล้มเหลวคือ "ไม่มีข้อมูลใหม่" ซึ่งเป็นสถานะที่หน้าเว็บรองรับอยู่แล้ว
    .catch(() => set({ status: 'done', remote: null }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (state.status === 'idle') load();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => initial;

export interface LiveDraw {
  /** ถามเสร็จแล้วหรือยัง — ใช้กันไม่ให้คำเตือนข้อมูลเก่าโผล่วาบก่อนรู้ผล */
  checked: boolean;
  /** งวดจาก KV เฉพาะเมื่อ **ใหม่กว่า** static (L3) ไม่อย่างนั้นเป็น null */
  remote: RemoteDraw | null;
}

/** งวดจาก KV ที่ใหม่กว่างวด static ที่หน้านี้ build มา */
export function useLiveDraw(staticDrawDate: string | undefined): LiveDraw {
  const { status, remote } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    checked: status === 'done',
    remote: remote && shouldPreferRemote(staticDrawDate, remote.draw.drawDate) ? remote : null,
  };
}

/** สำหรับเทสต์เท่านั้น — ตั้งสถานะตรง ๆ (null = กลับไปเริ่มใหม่ ให้ subscribe ครั้งถัดไปยิงคำขอจริง) */
export function __setRemoteForTests(next: RemoteState | null) {
  set(next ?? initial);
}
