import { PLAN_LIMITS, type PlanLimits } from '@/lib/plan-limits';
import { CellLimitError, pageIndices, parseCsv, toCsv } from './logic';
import type { Job, LimitHit, Output } from './types';

/**
 * ชนขีดจำกัดของแพลน (หน้า PDF / ขนาด zip เมื่อคลาย / ช่องตาราง)
 * แยกจาก Error ทั่วไปเพื่อให้ FileTool รู้ว่าควรเสนอพรีเมียมหรือบอกว่าไฟล์ใหญ่เกินไปจริง
 */
export class LimitError extends Error {
  constructor(
    message: string,
    public readonly kind: LimitHit['kind'],
    /** ขอบล่างของค่าที่พบ ดู LimitHit.atLeast — ตัวประมวลผลหยุดทันทีที่ชนเพดานจึงไม่รู้ยอดรวมจริง */
    public readonly atLeast: number,
  ) {
    super(message);
  }
}

/** Inspect ZIP central directory before Office parsers inflate it. */
export function checkOfficeZip(buffer: ArrayBuffer, expandedMb = PLAN_LIMITS.free.zipExpandedMb) {
  const view = new DataView(buffer);
  if (view.byteLength < 22 || view.getUint32(0, true) !== 0x04034b50)
    throw new Error('ไฟล์ Office ไม่ถูกต้อง กรุณาเลือกไฟล์ XLSX หรือ DOCX ที่เปิดได้ตามปกติ');
  let end = view.byteLength - 22;
  while (end >= Math.max(0, view.byteLength - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < Math.max(0, view.byteLength - 65557)) throw new Error('ไฟล์ Office เสียหาย');
  const entries = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    expanded = 0;
  if (entries > 2000) throw new Error('ไฟล์มีส่วนประกอบมากเกินไป กรุณาลดขนาดเอกสาร');
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error('โครงสร้างไฟล์ Office ไม่ถูกต้อง');
    expanded += view.getUint32(offset + 24, true);
    if (expanded > expandedMb * 1024 * 1024)
      throw new LimitError(
        `เอกสารเมื่อคลายไฟล์ใหญ่เกิน ${expandedMb} MB กรุณาแบ่งไฟล์ก่อน`,
        'zip',
        Math.ceil(expanded / 1024 / 1024),
      );
    offset +=
      46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}
export async function processDocument({ id, files, options, limits }: Job): Promise<Output> {
  const plan: PlanLimits = limits ?? PLAN_LIMITS.free;
  const stem = files[0].name.replace(/\.[^.]+$/, '');
  if (id.startsWith('pdf-')) {
    const { PDFDocument, degrees } = await import('pdf-lib');
    const result = await PDFDocument.create();
    let total = 0;
    for (const file of files) {
      let source;
      try {
        source = await PDFDocument.load(await file.arrayBuffer());
      } catch {
        throw new Error('เปิด PDF ไม่สำเร็จ ไฟล์อาจเสียหายหรือตั้งรหัสผ่าน กรุณาใช้ PDF ที่เปิดได้โดยไม่ต้องใส่รหัส');
      }
      total += source.getPageCount();
      if (total > plan.pages)
        throw new LimitError(`รองรับรวมไม่เกิน ${plan.pages} หน้า กรุณาแบ่งไฟล์ก่อน`, 'pages', total);
      let indices = source.getPageIndices();
      if (id === 'pdf-extract') indices = pageIndices(options.pages, source.getPageCount());
      if (id === 'pdf-remove-pages') {
        const removed = new Set(pageIndices(options.pages, source.getPageCount()));
        indices = indices.filter((i) => !removed.has(i));
      }
      if (!indices.length) throw new Error('ต้องเหลืออย่างน้อย 1 หน้าในไฟล์ผลลัพธ์');
      const pages = await result.copyPages(source, indices);
      for (const page of pages) {
        if (id === 'pdf-rotate') page.setRotation(degrees((page.getRotation().angle + options.angle) % 360));
        result.addPage(page);
      }
    }
    return {
      blob: new Blob([new Uint8Array(await result.save())], { type: 'application/pdf' }),
      name: `${id === 'pdf-merge' ? 'merged' : stem + '-' + id}.pdf`,
      summary: `PDF ${result.getPageCount()} หน้า`,
    };
  }
  const buffer = await files[0].arrayBuffer();
  if (id !== 'csv-to-excel') checkOfficeZip(buffer, plan.zipExpandedMb);
  if (id === 'word-to-text') {
    const mammoth = await import('mammoth/mammoth.browser.js');
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (!result.value.trim()) throw new Error('ไม่พบข้อความใน Word หากเป็นภาพสแกนต้องใช้ OCR');
    return {
      blob: new Blob(['\uFEFF', result.value], { type: 'text/plain;charset=utf-8' }),
      name: `${stem}.txt`,
      summary: 'ดึงข้อความแล้ว ไม่รวมรูปภาพและการจัดหน้า',
      text: result.value.slice(0, 5000),
    };
  }
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  if (id === 'csv-to-excel') {
    let text;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new Error('กรุณาบันทึก CSV เป็น UTF-8 ก่อนแปลง เพื่อให้ภาษาไทยถูกต้อง');
    }
    let rows: string[][];
    try {
      rows = parseCsv(text, options.delimiter, plan.cells);
    } catch (e) {
      if (e instanceof CellLimitError) throw new LimitError(e.message, 'cells', e.max + 1);
      throw e;
    }
    if (rows.some((row) => row.length > 16384)) throw new Error('Excel รองรับไม่เกิน 16,384 คอลัมน์');
    const sheet = workbook.addWorksheet('ข้อมูล');
    sheet.addRows(rows);
    return {
      blob: new Blob([new Uint8Array(await workbook.xlsx.writeBuffer())], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      name: `${stem}.xlsx`,
      summary: `${rows.length.toLocaleString('th-TH')} แถว · เก็บข้อมูลทุกช่องเป็นข้อความ`,
    };
  }
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[options.sheet - 1];
  if (!sheet) throw new Error(`ไฟล์นี้มี ${workbook.worksheets.length} ชีต กรุณาระบุลำดับชีตที่มีอยู่`);
  if (!sheet.rowCount || !sheet.columnCount) throw new Error('ชีตที่เลือกไม่มีข้อมูล');
  const cellCount = sheet.rowCount * sheet.columnCount;
  if (cellCount > plan.cells)
    throw new LimitError(
      `ชีตมีขนาดเกิน ${plan.cells.toLocaleString('th-TH')} ช่องข้อมูล กรุณาแบ่งตารางก่อน`,
      'cells',
      cellCount,
    );
  let missingFormula = 0;
  const rows = Array.from({ length: sheet.rowCount }, (_, r) =>
    Array.from({ length: sheet.columnCount }, (_, c) => {
      const cell = sheet.getCell(r + 1, c + 1);
      if (cell.type === ExcelJS.ValueType.Formula) {
        const result: unknown = cell.result;
        if (result === undefined) {
          missingFormula++;
          return '';
        }
        if (result instanceof Date) return result.toISOString();
        if (result !== null && typeof result === 'object' && 'error' in result) return String(result.error);
        return String(result);
      }
      if (cell.value instanceof Date) return cell.value.toISOString();
      return cell.text;
    }),
  );
  if (missingFormula)
    throw new Error(`พบ ${missingFormula} สูตรที่ไม่มีค่าบันทึกไว้ กรุณาเปิดไฟล์ใน Excel คำนวณและบันทึกก่อนแปลง`);
  return {
    blob: new Blob([toCsv(rows, options.delimiter)], { type: 'text/csv;charset=utf-8' }),
    name: `${stem}-sheet-${options.sheet}.csv`,
    summary: `ชีต “${sheet.name}” · ${rows.length.toLocaleString('th-TH')} แถว · CSV UTF-8`,
  };
}
