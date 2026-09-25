import { describe, expect, it } from 'vitest';
import { dimensions, fitOutput, pageIndices, parseCsv, planImage, toCsv } from './logic';
describe('PDF page selection', () => {
  it('preserves requested order, deduplicates and expands ranges', () =>
    expect(pageIndices('3, 1-2, 3', 5)).toEqual([2, 0, 1]));
  it.each(['', '0', '6', '3-1', '1.5', '1,', '-1', '1-999999999'])('rejects invalid selection %s', (input) =>
    expect(() => pageIndices(input, 5)).toThrow(),
  );
});
describe('CSV fidelity and limits', () => {
  it('supports Thai, BOM, quotes, delimiters, multiline and empty cells', () =>
    expect(parseCsv('\uFEFFชื่อ,รหัส,หมายเหตุ\r\nไทย,001,"a,b\n""c"""\r\n,,')).toEqual([
      ['ชื่อ', 'รหัส', 'หมายเหตุ'],
      ['ไทย', '001', 'a,b\n"c"'],
      ['', '', ''],
    ]));
  it('supports semicolons and tabs', () => {
    expect(parseCsv('a;b\n1;2', ';')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('a\tb', '\t')).toEqual([['a', 'b']]);
  });
  it.each(['"unclosed', 'abc"def', '"abc"x', ''])('rejects malformed CSV %s', (text) =>
    expect(() => parseCsv(text)).toThrow(),
  );
  it('neutralizes formula-looking cells and escapes output', () =>
    expect(parseCsv(toCsv([['=SUM(A1)', ' @cmd', '-2+3', '+A1', '-', 'ไทย,"a"']]))).toEqual([
      ["'=SUM(A1)", "' @cmd", "'-2+3", "'+A1", "'-", 'ไทย,"a"'],
    ]));
  it('leaves plain signed numbers untouched (negative amounts, +66 phone numbers)', () =>
    expect(parseCsv(toCsv([['-1500', '+66812345678', '-1,234.50', '+1.5e3', '-0.25']]))).toEqual([
      ['-1500', '+66812345678', '-1,234.50', '+1.5e3', '-0.25'],
    ]));
  it('bounds cell count', () => expect(() => parseCsv('a,'.repeat(100_001))).toThrow('100,000'));
});
describe('image dimensions', () => {
  it('retains aspect ratio', () => expect(dimensions(400, 200, 100)).toEqual({ width: 100, height: 50 }));
  it.each([0, -1, 0.5, 4097, NaN])('rejects invalid widths %s', (w) => expect(() => dimensions(400, 200, w)).toThrow());
  it('rejects resize outputs that exceed the canvas limit', () =>
    expect(() => dimensions(100, 10_000, 4096)).toThrow('ลดความกว้าง'));
});
describe('image output planning', () => {
  // รูปจากกล้องมือถือจริง: iPhone Pro 24MP (5712×4284) และ Samsung 50MP (8160×6120)
  const iphone = [5712, 4284] as const;
  const samsung = [8160, 6120] as const;
  it.each(['image-compress', 'image-convert', 'image-rotate'] as const)(
    '%s scales large phone photos down within the canvas limit instead of failing',
    (id) => {
      for (const [w, h] of [iphone, samsung]) {
        const out = planImage(id, w, h, 1200);
        expect(out.reduced).toBe(true);
        expect(out.width * out.height).toBeLessThanOrEqual(16_000_000);
        expect(Math.abs(out.width / out.height - w / h)).toBeLessThan(0.01);
      }
    },
  );
  it('keeps small images at full size', () =>
    expect(planImage('image-compress', 4000, 3000, 1200)).toEqual({ width: 4000, height: 3000, reduced: false }));
  it('resizes large sources to the requested width', () =>
    expect(planImage('image-resize', 8160, 6120, 1200)).toEqual({ width: 1200, height: 900, reduced: false }));
  it('limits images-to-pdf pages to 2400 px on the long side', () =>
    expect(planImage('images-to-pdf', 8160, 6120, 1200)).toEqual({ width: 2400, height: 1800, reduced: false }));
  it('caps the longest side at 16384 px', () => {
    const out = planImage('image-convert', 30_000, 1000, 1200);
    expect(out.width).toBeLessThanOrEqual(16384);
    expect(out.reduced).toBe(true);
  });
  it('rejects absurdly large sources with a clear message', () =>
    expect(() => planImage('image-compress', 16_000, 12_000, 1200)).toThrow('ล้านพิกเซล'));
  it('fits within arbitrary limits', () =>
    expect(fitOutput(5000, 5000, 16384, 16_000_000)).toEqual({ width: 4000, height: 4000, reduced: true }));
});
