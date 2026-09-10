import { MAX_CELLS, MAX_PAGES, pageIndices, parseCsv, toCsv } from './logic';
import type { Job, Output } from './types';

/** Inspect ZIP central directory before Office parsers inflate it. */
export function checkOfficeZip(buffer: ArrayBuffer) {
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
    if (expanded > 30 * 1024 * 1024) throw new Error('เอกสารเมื่อคลายไฟล์ใหญ่เกิน 30 MB กรุณาแบ่งไฟล์ก่อน');
    offset +=
      46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}
export async function processDocument({ id, files, options }: Job): Promise<Output> {
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
      if (total > MAX_PAGES) throw new Error(`รองรับรวมไม่เกิน ${MAX_PAGES} หน้า กรุณาแบ่งไฟล์ก่อน`);
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
  if (id !== 'csv-to-excel') checkOfficeZip(buffer);
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
    const rows = parseCsv(text, options.delimiter);
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
  if (sheet.rowCount * sheet.columnCount > MAX_CELLS)
    throw new Error('ชีตมีขนาดเกิน 100,000 ช่องข้อมูล กรุณาแบ่งตารางก่อน');
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
