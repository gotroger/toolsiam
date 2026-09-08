import { describe, it, expect } from 'vitest';
import { DAILY_CATEGORIES, DAILY_POOL } from './daily-pool';
import { pickForGroup } from '@/lib/seeded';
import { ZODIAC_SIGNS } from '@/lib/thai-astro';

describe('คลังข้อความดวงรายวัน', () => {
  it('มีครบทุกหมวดตามที่ประกาศไว้', () => {
    for (const c of DAILY_CATEGORIES) expect(DAILY_POOL[c.id], c.id).toBeDefined();
  });

  it('ทุกหมวดมีข้อความอย่างน้อย 60 ข้อ เพื่อไม่ให้ซ้ำเร็ว', () => {
    for (const c of DAILY_CATEGORIES) {
      expect(DAILY_POOL[c.id].length, c.id).toBeGreaterThanOrEqual(60);
    }
  });

  it('pool ใหญ่พอแจกให้ 12 ราศีในวันเดียวกันโดยไม่ซ้ำ', () => {
    for (const c of DAILY_CATEGORIES) {
      expect(DAILY_POOL[c.id].length).toBeGreaterThanOrEqual(ZODIAC_SIGNS.length);
    }
  });

  it('ไม่มีข้อความซ้ำกันใน pool เดียวกัน', () => {
    for (const c of DAILY_CATEGORIES) {
      expect(new Set(DAILY_POOL[c.id]).size, c.id).toBe(DAILY_POOL[c.id].length);
    }
  });

  it('ทุกข้อความยาวพอที่จะมีเนื้อหา ไม่ใช่คำสั้น ๆ', () => {
    for (const c of DAILY_CATEGORIES) {
      for (const msg of DAILY_POOL[c.id]) expect(msg.length, msg).toBeGreaterThan(25);
    }
  });

  it('ไม่มีเลขเด็ดหรือการชวนเสี่ยงโชค และไม่ให้คำแนะนำการลงทุนเจาะจง', () => {
    const banned = /เลขเด็ด|เลขนำโชค|ซื้อหวย|แทงหวย|ควรซื้อหุ้น|ควรลงทุนใน|การันตีผลตอบแทน/;
    for (const c of DAILY_CATEGORIES) {
      for (const msg of DAILY_POOL[c.id]) expect(banned.test(msg), msg).toBe(false);
    }
  });

  it('ไม่ทำนายเรื่องร้ายแรงอย่างอุบัติเหตุหรือความตาย', () => {
    const banned = /จะตาย|อุบัติเหตุร้ายแรง|เสียชีวิต|ป่วยหนัก/;
    for (const c of DAILY_CATEGORIES) {
      for (const msg of DAILY_POOL[c.id]) expect(banned.test(msg), msg).toBe(false);
    }
  });

  it('ทั้ง 12 ราศีได้ข้อความคนละข้อในวันเดียวกันทุกหมวด', () => {
    for (const day of ['2026-09-08', '2026-09-09', '2027-02-01']) {
      for (const c of DAILY_CATEGORIES) {
        const picks = ZODIAC_SIGNS.map((_, i) =>
          pickForGroup(DAILY_POOL[c.id], `${c.id}-${day}`, i, ZODIAC_SIGNS.length));
        expect(new Set(picks).size, `${day} ${c.id}`).toBe(ZODIAC_SIGNS.length);
      }
    }
  });

  it('ราศีเดิมวันเดิมได้ข้อความเดิมเสมอ และเปลี่ยนเมื่อข้ามวัน', () => {
    const pick = (day: string) => pickForGroup(DAILY_POOL.love, `love-${day}`, 0, 12);
    expect(pick('2026-09-08')).toBe(pick('2026-09-08'));
    expect(pick('2026-09-08')).not.toBe(pick('2026-09-09'));
  });
});
