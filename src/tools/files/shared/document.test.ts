// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PDFDocument, degrees } from 'pdf-lib';
import ExcelJS from 'exceljs';
import { strToU8, zipSync } from 'fflate';
import { checkOfficeZip, LimitError, processDocument } from './document';
import { PLAN_LIMITS } from '@/lib/plan-limits';
import { parseCsv } from './logic';
import type { Options } from './types';
const options: Options = {
  pages: '2,1',
  angle: 90,
  sheet: 1,
  delimiter: ',',
  format: 'image/png',
  quality: 80,
  width: 1200,
  flip: false,
};
async function pdfFile(name: string, sizes: number[]) {
  const pdf = await PDFDocument.create();
  sizes.forEach((size) => pdf.addPage([size, 200]));
  return new File([new Uint8Array(await pdf.save())], name);
}
describe('PDF actual output', () => {
  it('merges in file order', async () => {
    const output = await processDocument({
      id: 'pdf-merge',
      files: [await pdfFile('a.pdf', [100, 110]), await pdfFile('b.pdf', [120])],
      options,
    });
    const pdf = await PDFDocument.load(await output.blob.arrayBuffer());
    expect(pdf.getPages().map((p) => p.getWidth())).toEqual([100, 110, 120]);
  });
  it('extracts, removes and rotates pages', async () => {
    const file = await pdfFile('a.pdf', [100, 110, 120]);
    const extract = await processDocument({ id: 'pdf-extract', files: [file], options });
    expect((await PDFDocument.load(await extract.blob.arrayBuffer())).getPages().map((p) => p.getWidth())).toEqual([
      110, 100,
    ]);
    const remove = await processDocument({ id: 'pdf-remove-pages', files: [file], options });
    expect((await PDFDocument.load(await remove.blob.arrayBuffer())).getPages().map((p) => p.getWidth())).toEqual([
      120,
    ]);
    const source = await PDFDocument.load(await file.arrayBuffer());
    source.getPage(0).setRotation(degrees(270));
    const rotate = await processDocument({
      id: 'pdf-rotate',
      files: [new File([new Uint8Array(await source.save())], 'a.pdf')],
      options,
    });
    expect(
      (await PDFDocument.load(await rotate.blob.arrayBuffer())).getPages().map((p) => p.getRotation().angle),
    ).toEqual([0, 90, 90]);
  });
  it('rejects deleting every page, corrupt files and >150 pages', async () => {
    await expect(
      processDocument({ id: 'pdf-remove-pages', files: [await pdfFile('a.pdf', [100, 110])], options }),
    ).rejects.toThrow('อย่างน้อย');
    await expect(processDocument({ id: 'pdf-merge', files: [new File(['bad'], 'a.pdf')], options })).rejects.toThrow(
      'เปิด PDF',
    );
    await expect(
      processDocument({ id: 'pdf-extract', files: [await pdfFile('a.pdf', Array(151).fill(100))], options }),
    ).rejects.toThrow('150');
  });
  it('ขีดจำกัดหน้ามากับ Job.limits — พรีเมียมรับ 151 หน้า และการชนเพดานเป็น LimitError ที่บอกจำนวนหน้าจริง', async () => {
    const big = await pdfFile('a.pdf', Array(151).fill(100));
    const output = await processDocument({ id: 'pdf-rotate', files: [big], options, limits: PLAN_LIMITS.premium });
    expect((await PDFDocument.load(await output.blob.arrayBuffer())).getPageCount()).toBe(151);
    const error = await processDocument({ id: 'pdf-rotate', files: [big], options }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LimitError);
    expect(error).toMatchObject({ kind: 'pages', value: 151 });
    const tiny = { ...PLAN_LIMITS.free, pages: 2 };
    await expect(
      processDocument({
        id: 'pdf-merge',
        files: [await pdfFile('a.pdf', [1, 2]), await pdfFile('b.pdf', [3])],
        options,
        limits: tiny,
      }),
    ).rejects.toThrow('2 หน้า');
  });
});
describe('Office actual output', () => {
  it('writes real XLSX while preserving Thai, leading zeros and formula text', async () => {
    const output = await processDocument({
      id: 'csv-to-excel',
      files: [new File(['ชื่อ,รหัส,ค่า\nไทย,001,=1+1'], 'a.csv')],
      options,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await output.blob.arrayBuffer());
    expect(workbook.worksheets[0].getCell('B2').value).toBe('001');
    expect(workbook.worksheets[0].getCell('C2').type).toBe(ExcelJS.ValueType.String);
    const csv = await processDocument({ id: 'excel-to-csv', files: [new File([output.blob], 'a.xlsx')], options });
    expect(parseCsv(await csv.blob.text())[1]).toEqual(['ไทย', '001', "'=1+1"]);
  });
  it('selects sheets and rejects missing formula caches', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('แรก').addRow(['a']);
    const second = workbook.addWorksheet('สอง');
    second.addRow([{ formula: '1+1', result: 2 }]);
    const file = new File([new Uint8Array(await workbook.xlsx.writeBuffer())], 'a.xlsx');
    const csv = await processDocument({ id: 'excel-to-csv', files: [file], options: { ...options, sheet: 2 } });
    expect(parseCsv(await csv.blob.text())).toEqual([['2']]);
    await expect(
      processDocument({ id: 'excel-to-csv', files: [file], options: { ...options, sheet: 3 } }),
    ).rejects.toThrow('2 ชีต');
    second.getCell('A1').value = { formula: '1+1' };
    await expect(
      processDocument({
        id: 'excel-to-csv',
        files: [new File([new Uint8Array(await workbook.xlsx.writeBuffer())], 'a.xlsx')],
        options: { ...options, sheet: 2 },
      }),
    ).rejects.toThrow('ไม่มีค่าบันทึก');
  });
  it('extracts Thai DOCX text from a real OOXML container', async () => {
    const zip = zipSync({
      '[Content_Types].xml': strToU8(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      ),
      '_rels/.rels': strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      'word/document.xml': strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>สวัสดี ToolSiam</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    const output = await processDocument({
      id: 'word-to-text',
      files: [new File([new Uint8Array(zip)], 'a.docx')],
      options,
    });
    expect(await output.blob.text()).toContain('สวัสดี ToolSiam');
  });
  it('rejects invalid Office, oversized expansion and non-UTF8 CSV', async () => {
    expect(() => checkOfficeZip(new ArrayBuffer(24))).toThrow();
    const zip = zipSync({ a: new Uint8Array(1) });
    const view = new DataView(zip.buffer);
    for (let i = 0; i < zip.length - 46; i++) {
      if (view.getUint32(i, true) === 0x02014b50) {
        view.setUint32(i + 24, 40 * 1024 * 1024, true);
        break;
      }
    }
    expect(() => checkOfficeZip(zip.buffer)).toThrow('30 MB');
    // พรีเมียมคลายได้ถึง 120 MB — 40 MB จึงผ่าน · ชนเพดานเป็น LimitError ชนิด zip
    expect(() => checkOfficeZip(zip.buffer, PLAN_LIMITS.premium.zipExpandedMb)).not.toThrow();
    const hit = (() => {
      try {
        checkOfficeZip(zip.buffer);
      } catch (e) {
        return e;
      }
    })();
    expect(hit).toBeInstanceOf(LimitError);
    expect(hit).toMatchObject({ kind: 'zip', value: 40 });
    // ช่องตารางก็เช่นกัน: ส่ง limits เล็ก ๆ แล้วต้องได้ LimitError ชนิด cells
    const cells = await processDocument({
      id: 'csv-to-excel',
      files: [new File(['a,b,c\n1,2,3'], 'a.csv')],
      options,
      limits: { ...PLAN_LIMITS.free, cells: 4 },
    }).catch((e: unknown) => e);
    expect(cells).toBeInstanceOf(LimitError);
    expect(cells).toMatchObject({ kind: 'cells', value: 5 });
    await expect(
      processDocument({
        id: 'csv-to-excel',
        files: [new File([new Uint8Array([0xff, 0xfe, 0x00])], 'a.csv')],
        options,
      }),
    ).rejects.toThrow('UTF-8');
  });
});
