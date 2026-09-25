import { PLAN_LIMITS } from '@/lib/plan-limits';
import type { FileToolId } from '../catalog';

/** ค่าเริ่มต้น = แพลนฟรี — ตัวเลขจริงมาจาก src/lib/plan-limits.ts และถูกส่งมากับ Job ตามแพลนของผู้ใช้ */
export const MAX_PAGES = PLAN_LIMITS.free.pages;
export const MAX_CELLS = PLAN_LIMITS.free.cells;

/** ชนเพดานจำนวนช่องข้อมูล — document.ts แปลงเป็น LimitError ที่ UI รู้จัก (logic.ts ไม่ import types ของ worker) */
export class CellLimitError extends Error {
  constructor(public readonly max: number) {
    super(`รองรับไม่เกิน ${max.toLocaleString('th-TH')} ช่องข้อมูล`);
  }
}
export function pageIndices(input: string, count: number): number[] {
  if (!input.trim()) throw new Error('กรุณาระบุหมายเลขหน้า เช่น 1,3-5');
  const result = new Set<number>();
  for (const token of input.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('รูปแบบหน้าไม่ถูกต้อง ใช้ตัวเลขและช่วงหน้า เช่น 1,3-5');
    const start = Number(match[1]),
      end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > count)
      throw new Error(`ระบุหน้าได้ตั้งแต่ 1 ถึง ${count} และช่วงหน้าต้องเรียงจากน้อยไปมาก`);
    for (let i = start; i <= end; i++) result.add(i - 1);
  }
  return [...result];
}
export function parseCsv(text: string, delimiter = ',', maxCells = MAX_CELLS): string[][] {
  text = text.replace(/^\uFEFF/, '');
  if (!text.trim()) throw new Error('CSV ไม่มีข้อมูล');
  const rows: string[][] = [];
  let row: string[] = [],
    value = '',
    quoted = false,
    closed = false,
    cells = 0;
  const cell = () => {
    row.push(value);
    value = '';
    closed = false;
    if (++cells > maxCells) throw new CellLimitError(maxCells);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else value += c;
    } else if (c === delimiter) cell();
    else if (c === '\n' || c === '\r') {
      cell();
      rows.push(row);
      row = [];
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else if (c === '"' && !value && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error('CSV มีเครื่องหมายคำพูดไม่ถูกต้อง กรุณาตรวจไฟล์ต้นฉบับ');
      value += c;
    }
  }
  if (quoted) throw new Error('CSV มีเครื่องหมายคำพูดที่ยังไม่ปิด');
  if (value || row.length || closed) {
    cell();
    rows.push(row);
  }
  return rows;
}
/** ตัวเลขล้วน เช่น -1500 · +66812345678 · -1,234.50 · 1.5e3 — ส่วน -2+3 หรือ +A1 ยังนับเป็นสูตร */
const PLAIN_NUMBER = /^[+-]?\d[\d,]*(\.\d+)?(e[+-]?\d+)?$/i;
export function toCsv(rows: string[][], delimiter = ','): string {
  // Neutralize spreadsheet formula injection when the downloaded CSV is opened in Excel.
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            // ตัวเลขล้วนที่มีเครื่องหมาย (ยอดติดลบ -1500, เบอร์ +668…) ไม่ใช่สูตร — อย่าเติม ' ให้ข้อมูลเพี้ยน
            const formula = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) && !PLAIN_NUMBER.test(value);
            const safe = formula ? "'" + value : value;
            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(delimiter),
      )
      .join('\r\n')
  );
}
/** เพดานรูปต้นฉบับ — รูปกล้องมือถือ 24–108 ล้านพิกเซลต้องผ่าน แต่เกินนี้เสี่ยงหน่วยความจำเบราว์เซอร์หมด */
export const MAX_SOURCE_PIXELS = 120_000_000;
/** เพดาน canvas ผลลัพธ์ — iOS Safari วาด canvas ได้ราว 16.7 ล้านพิกเซล และด้านยาวสุด 16384 */
export const MAX_OUTPUT_PIXELS = 16_000_000;
export const MAX_OUTPUT_SIDE = 16384;
/** ด้านยาวสุดของรูปที่ฝังลง PDF — A4 ที่ 2400 พิกเซลคมพอพิมพ์ และไฟล์ไม่บวม */
export const PDF_IMAGE_SIDE = 2400;

export interface ImagePlan {
  width: number;
  height: number;
  /** true = ต้องย่อจากขนาดเดิมเพื่อให้เบราว์เซอร์วาดได้ — UI ต้องบอกผู้ใช้ */
  reduced: boolean;
}

/** ย่อขนาดให้อยู่ในเพดานโดยคงสัดส่วน (ปัดลงเพื่อไม่ให้ล้นเพดาน) */
export function fitOutput(
  width: number,
  height: number,
  maxSide = MAX_OUTPUT_SIDE,
  maxPixels = MAX_OUTPUT_PIXELS,
): ImagePlan {
  const scale = Math.min(1, maxSide / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
  if (scale >= 1) return { width, height, reduced: false };
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    reduced: true,
  };
}

/** ขนาดผลลัพธ์ของการปรับความกว้าง — ตรวจเฉพาะผลลัพธ์ ต้นฉบับใหญ่แค่ไหนก็ย่อได้ (ถ้าไม่เกิน MAX_SOURCE_PIXELS) */
export function dimensions(width: number, height: number, targetWidth: number) {
  const w = targetWidth;
  if (!Number.isInteger(w) || w < 1 || w > 4096) throw new Error('กรุณาระบุความกว้างเป็นจำนวนเต็ม 1–4096 พิกเซล');
  const h = Math.max(1, Math.round((height * w) / width));
  if (w * h > MAX_OUTPUT_PIXELS || h > MAX_OUTPUT_SIDE)
    throw new Error(
      `รูปนี้สูงมาก ถ้ากว้าง ${w} พิกเซลจะสูง ${h.toLocaleString('th-TH')} พิกเซล เกินที่เบราว์เซอร์วาดได้ กรุณาลดความกว้าง`,
    );
  return { width: w, height: h };
}

/**
 * วางแผนขนาดผลลัพธ์จากขนาดต้นฉบับ — ต้นฉบับใหญ่ได้ถึง MAX_SOURCE_PIXELS
 * งานที่คงขนาดเดิม (บีบอัด/แปลงชนิด/หมุน) จะย่ออัตโนมัติให้อยู่ในเพดาน canvas แทนการปฏิเสธ
 */
export function planImage(id: FileToolId, width: number, height: number, targetWidth: number): ImagePlan {
  if (!(width >= 1 && height >= 1)) throw new Error('อ่านขนาดรูปไม่ได้ กรุณาเลือกไฟล์รูปที่ไม่เสียหาย');
  if (width * height > MAX_SOURCE_PIXELS)
    throw new Error(
      `รูปต้นฉบับใหญ่เกินไป (${Math.round((width * height) / 1_000_000)} ล้านพิกเซล) รองรับไม่เกิน ${MAX_SOURCE_PIXELS / 1_000_000} ล้านพิกเซล กรุณาย่อรูปก่อน`,
    );
  if (id === 'image-resize') return { ...dimensions(width, height, targetWidth), reduced: false };
  if (id === 'images-to-pdf') return { ...fitOutput(width, height, PDF_IMAGE_SIDE, Infinity), reduced: false };
  return fitOutput(width, height);
}
