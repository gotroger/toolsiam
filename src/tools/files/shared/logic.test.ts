import { describe, expect, it } from 'vitest';
import { dimensions, pageIndices, parseCsv, toCsv } from './logic';
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
    expect(parseCsv(toCsv([['=SUM(A1)', ' @cmd', '-1', '+2', 'ไทย,"a"']]))).toEqual([
      ["'=SUM(A1)", "' @cmd", "'-1", "'+2", 'ไทย,"a"'],
    ]));
  it('bounds cell count', () => expect(() => parseCsv('a,'.repeat(100_001))).toThrow('100,000'));
});
describe('image dimensions', () => {
  it('retains aspect ratio', () => expect(dimensions(400, 200, 100)).toEqual({ width: 100, height: 50 }));
  it.each([0, -1, 0.5, 4097, NaN])('rejects invalid widths %s', (w) => expect(() => dimensions(400, 200, w)).toThrow());
  it('rejects oversized pixel buffers', () => expect(() => dimensions(5000, 5000)).toThrow());
});
