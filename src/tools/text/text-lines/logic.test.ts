import { describe, it, expect } from 'vitest';
import { processLines, DEFAULT_LINE_OPTIONS, type LineOptions } from './logic';

const opts = (over: Partial<LineOptions> = {}): LineOptions => ({ ...DEFAULT_LINE_OPTIONS, ...over });

describe('processLines', () => {
  it('ค่าเริ่มต้นไม่เปลี่ยนข้อความ', () => {
    const r = processLines('b\na\nb', opts());
    expect(r.text).toBe('b\na\nb');
    expect(r.stats).toEqual({ input: 3, output: 3, removed: 0 });
  });

  it('ลบบรรทัดซ้ำ เก็บอันแรกไว้', () => {
    const r = processLines('b\na\nb\na', opts({ unique: true }));
    expect(r.text).toBe('b\na');
    expect(r.stats.removed).toBe(2);
  });

  it('ลบซ้ำแบบไม่สนตัวพิมพ์', () => {
    expect(processLines('Apple\napple', opts({ unique: true })).text).toBe('Apple\napple');
    expect(processLines('Apple\napple', opts({ unique: true, caseInsensitive: true })).text).toBe('Apple');
  });

  it('ตัดช่องว่างหัวท้ายบรรทัด', () => {
    expect(processLines('  a  \n b', opts({ trim: true })).text).toBe('a\nb');
  });

  it('ลบบรรทัดว่าง', () => {
    const r = processLines('a\n\n\nb', opts({ removeEmpty: true }));
    expect(r.text).toBe('a\nb');
    expect(r.stats.output).toBe(2);
  });

  it('เรียงจากน้อยไปมากด้วยลำดับภาษาไทย', () => {
    expect(processLines('ขนม\nกล้วย\nคน', opts({ sort: 'asc' })).text).toBe('กล้วย\nขนม\nคน');
  });

  it('เรียงจากมากไปน้อย', () => {
    expect(processLines('a\nc\nb', opts({ sort: 'desc' })).text).toBe('c\nb\na');
  });

  it('กลับลำดับบรรทัด', () => {
    expect(processLines('a\nb\nc', opts({ reverse: true })).text).toBe('c\nb\na');
  });

  it('ใส่เลขลำดับหน้าบรรทัด', () => {
    expect(processLines('a\nb', opts({ addNumbers: true })).text).toBe('1. a\n2. b');
  });

  it('รวมหลายตัวเลือก: ตัดช่องว่าง + ลบว่าง + ลบซ้ำ + เรียง', () => {
    const r = processLines('  b \n\n a\nb  \n', opts({ trim: true, removeEmpty: true, unique: true, sort: 'asc' }));
    expect(r.text).toBe('a\nb');
    expect(r.stats.input).toBe(5);
    expect(r.stats.output).toBe(2);
  });

  it('รองรับ CRLF และคืนค่าเป็น LF', () => {
    expect(processLines('a\r\nb', opts()).text).toBe('a\nb');
  });

  it('ข้อความว่างได้ผลว่าง', () => {
    const r = processLines('', opts({ removeEmpty: true }));
    expect(r.text).toBe('');
    expect(r.stats).toEqual({ input: 0, output: 0, removed: 0 });
  });
});
