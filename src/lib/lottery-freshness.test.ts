import { describe, it, expect } from 'vitest';
import { drawFreshness, expectedDrawBy, isStale, shouldPreferRemote, STALE_AFTER_DAYS } from './lottery-freshness';
import { DRAWS } from '@/data/lottery';
import { addDays } from '@/lib/date';

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

describe('L5 — เตือนเมื่อพ้นวันออกรางวัลตามกำหนดแล้วแต่ยังไม่มีผล', () => {
  it('วันถัดจากวันออกรางวัลปกติ ถ้ายังไม่มีผลงวดนั้นต้องเตือน ไม่ต้องรอ 18 วัน', () => {
    expect(drawFreshness('2026-09-01', '2026-09-17')).toEqual({ kind: 'missed-draw', expectedDate: '2026-09-16' });
    expect(drawFreshness('2026-08-16', '2026-09-02')).toEqual({ kind: 'missed-draw', expectedDate: '2026-09-01' });
  });

  it('ไม่เตือนในวันออกรางวัลเอง — ผลยังไม่ออกเป็นเรื่องปกติ', () => {
    expect(drawFreshness('2026-09-01', '2026-09-16')).toEqual({ kind: 'fresh' });
    expect(drawFreshness('2026-08-16', '2026-09-01')).toEqual({ kind: 'fresh' });
  });

  it('มีผลงวดที่คาดไว้แล้วไม่เตือน', () => {
    expect(drawFreshness('2026-09-16', '2026-09-17')).toEqual({ kind: 'fresh' });
    expect(drawFreshness('2026-09-16', '2026-09-30')).toEqual({ kind: 'fresh' });
  });

  it('งวดที่มักเลื่อนเพราะวันหยุด (1 ม.ค. · 16 ม.ค. วันครู · 1 พ.ค. วันแรงงาน) ให้เวลาเพิ่มหนึ่งวัน', () => {
    expect(drawFreshness('2025-12-16', '2026-01-02')).toEqual({ kind: 'fresh' });
    expect(drawFreshness('2026-01-02', '2026-01-17')).toEqual({ kind: 'fresh' });
    expect(drawFreshness('2026-04-16', '2026-05-02')).toEqual({ kind: 'fresh' });
    expect(drawFreshness('2026-04-16', '2026-05-03')).toEqual({ kind: 'missed-draw', expectedDate: '2026-05-01' });
  });

  it('งวดที่เลื่อนขึ้นมาออกก่อนกำหนด (เช่น 30 ธ.ค. แทน 1 ม.ค.) นับว่าครอบคลุมงวดนั้นแล้ว', () => {
    expect(drawFreshness('2026-12-30', '2027-01-05')).toEqual({ kind: 'fresh' });
  });

  it('เก่าเกิน 18 วันยังเป็นตัวกันสุดท้าย และแรงกว่าการเตือนตามกำหนด', () => {
    expect(drawFreshness('2026-09-01', '2026-09-20')).toEqual({ kind: 'stale' });
  });

  it('ไม่เตือนผิดเลยสักวันตลอดประวัติงวดจริงที่มีในคลัง รวมงวดที่เลื่อน', () => {
    const dates = DRAWS.map((d) => d.drawDate).sort();
    for (let i = 1; i < dates.length; i++) {
      // ตั้งแต่วันที่งวดก่อนออก จนถึงเช้าวันที่งวดถัดไปออก (ยังไม่มีผล)
      for (let d = dates[i - 1]; d <= dates[i]; d = addDays(d, 1)) {
        expect(drawFreshness(dates[i - 1], d), `${dates[i - 1]} @ ${d}`).toEqual({ kind: 'fresh' });
      }
    }
  });

  it('expectedDrawBy หางวดตามกำหนดล่าสุดที่พ้นช่วงผ่อนผันแล้ว', () => {
    expect(expectedDrawBy('2026-09-16')).toBe('2026-09-01');
    expect(expectedDrawBy('2026-09-17')).toBe('2026-09-16');
    expect(expectedDrawBy('2026-01-02')).toBe('2025-12-16');
    expect(expectedDrawBy('2026-01-03')).toBe('2026-01-01');
  });
});
