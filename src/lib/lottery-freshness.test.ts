import { describe, it, expect } from 'vitest';
import { isStale, shouldPreferRemote, STALE_AFTER_DAYS } from './lottery-freshness';

describe('L5 — ตรวจว่าผลที่แสดงเก่าเกินไปหรือยัง', () => {
  it('งวดที่เพิ่งออกไม่ถือว่าเก่า', () => {
    expect(isStale('2026-09-01', '2026-09-01')).toBe(false);
    expect(isStale('2026-09-01', '2026-09-10')).toBe(false);
  });

  it('ระยะห่างปกติระหว่างงวด (13–16 วัน) ไม่ทำให้เตือนผิด', () => {
    expect(isStale('2026-09-01', '2026-09-16')).toBe(false);
    expect(isStale('2026-01-02', '2026-01-17')).toBe(false);
  });

  it('เกินเกณฑ์แล้วถือว่าเก่า — น่าจะพลาดงวดไปแล้ว', () => {
    expect(isStale('2026-09-01', '2026-09-19')).toBe(false);
    expect(isStale('2026-09-01', '2026-09-20')).toBe(true);
    expect(isStale('2026-09-01', '2026-10-05')).toBe(true);
  });

  it('เกณฑ์อยู่ที่ 18 วันตามที่ประกาศไว้', () => {
    expect(STALE_AFTER_DAYS).toBe(18);
  });
});

describe('L3 — ไฟล์ใน repo ชนะ KV', () => {
  it('KV ชนะเฉพาะเมื่อเป็นงวดที่ใหม่กว่า', () => {
    expect(shouldPreferRemote('2026-09-01', '2026-09-16')).toBe(true);
  });

  it('งวดเดียวกันใช้ของ static เพราะผ่านสายตาคนมาแล้ว', () => {
    expect(shouldPreferRemote('2026-09-01', '2026-09-01')).toBe(false);
  });

  it('งวดเก่ากว่าไม่ถูกนำมาแสดง', () => {
    expect(shouldPreferRemote('2026-09-01', '2026-08-16')).toBe(false);
  });

  it('ยังไม่มี static เลยก็ใช้ของ KV ได้', () => {
    expect(shouldPreferRemote(undefined, '2026-09-01')).toBe(true);
  });
});
