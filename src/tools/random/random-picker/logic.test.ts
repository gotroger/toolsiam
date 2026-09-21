import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import { MAX_PICK, pickWinners } from './logic';

const NAMES = ['สมชาย', 'สมหญิง', 'วิชัย', 'มานี', 'ปิติ'];
const rng = () => seededRng('งานเลี้ยง');

describe('pickWinners', () => {
  it('สุ่มหนึ่งรายการได้สมาชิกที่อยู่ในรายการจริง', () => {
    const out = pickWinners(NAMES, { count: 1, allowRepeat: false }, rng());
    expect(out).toHaveLength(1);
    expect(NAMES).toContain(out[0]);
  });

  it('โหมดไม่ซ้ำ — ไม่มีใครถูกเลือกสองครั้ง', () => {
    const out = pickWinners(NAMES, { count: 5, allowRepeat: false }, rng());
    expect(new Set(out).size).toBe(5);
    expect([...out].sort()).toEqual([...NAMES].sort());
  });

  it('โหมดไม่ซ้ำ — ขอมากกว่าจำนวนที่มีเป็นข้อผิดพลาดที่บอกจำนวนจริง', () => {
    expect(() => pickWinners(NAMES, { count: 6, allowRepeat: false }, rng())).toThrow(/5/);
  });

  it('โหมดซ้ำได้ — ขอมากกว่าจำนวนที่มีได้', () => {
    const out = pickWinners(['ก', 'ข'], { count: 7, allowRepeat: true }, rng());
    expect(out).toHaveLength(7);
    for (const name of out) expect(['ก', 'ข']).toContain(name);
  });

  it('รายการว่างเป็นข้อผิดพลาด', () => {
    expect(() => pickWinners([], { count: 1, allowRepeat: false }, rng())).toThrow();
  });

  it('รายการเดียวสุ่มได้รายการนั้น', () => {
    expect(pickWinners(['เดียว'], { count: 1, allowRepeat: false }, rng())).toEqual(['เดียว']);
  });

  it('จำนวนที่สุ่มต้องเป็นจำนวนเต็มตั้งแต่ 1', () => {
    expect(() => pickWinners(NAMES, { count: 0, allowRepeat: false }, rng())).toThrow();
    expect(() => pickWinners(NAMES, { count: -1, allowRepeat: false }, rng())).toThrow();
    expect(() => pickWinners(NAMES, { count: 1.5, allowRepeat: false }, rng())).toThrow();
  });

  it('ขอเกินเพดานเป็นข้อผิดพลาด', () => {
    expect(() => pickWinners(NAMES, { count: MAX_PICK + 1, allowRepeat: true }, rng())).toThrow();
  });

  it('seed เดิมให้ผู้โชคดีคนเดิมเสมอ — นี่คือสิ่งที่ทำให้ตรวจย้อนหลังได้', () => {
    const a = pickWinners(NAMES, { count: 3, allowRepeat: false }, seededRng('ABCD-1234'));
    const b = pickWinners(NAMES, { count: 3, allowRepeat: false }, seededRng('ABCD-1234'));
    expect(a).toEqual(b);
  });

  it('seed ต่างกันให้ผลต่างกัน', () => {
    const a = pickWinners(NAMES, { count: 3, allowRepeat: false }, seededRng('ABCD-1234'));
    const b = pickWinners(NAMES, { count: 3, allowRepeat: false }, seededRng('WXYZ-9876'));
    expect(a).not.toEqual(b);
  });
});
