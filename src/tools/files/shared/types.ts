import type { PlanLimits } from '@/lib/plan-limits';
import type { FileToolId } from '../catalog';
export interface Options {
  pages: string;
  angle: number;
  sheet: number;
  delimiter: string;
  format: string;
  quality: number;
  width: number;
  flip: boolean;
}
export interface Job {
  id: FileToolId;
  files: File[];
  options: Options;
  /**
   * ขีดจำกัดตามแพลนของผู้ใช้ — ส่งมากับงานเพราะ Web Worker อ่าน cookie / เรียก /api/me ไม่ได้
   * ไม่ระบุ = แพลนฟรี (เทสต์เก่าและตัวเรียกที่ไม่รู้จักแพลน)
   */
  limits?: PlanLimits;
}
export interface Output {
  blob: Blob;
  name: string;
  summary: string;
  text?: string;
}
/** ขีดจำกัดที่ถูกชนระหว่างประมวลผล — ให้ UI ตัดสินได้ว่าเป็นเรื่องแพลนหรือไฟล์ใหญ่เกินไปจริง */
export interface LimitHit {
  kind: 'pages' | 'zip' | 'cells';
  /** ค่าที่พบในไฟล์ (เช่น จำนวนหน้ารวม) */
  value: number;
}
export type WorkerReply =
  { output: Output; error?: never; limit?: never } | { error: string; output?: never; limit?: LimitHit };
