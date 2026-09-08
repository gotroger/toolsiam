import { describe, it, expect } from 'vitest';
import { actualDrawDate, nextDrawDate, scheduledDrawDates, upcomingDrawDates } from './schedule';
import { DRAW_DATE_CHANGES } from './data/schedule';

describe('ปฏิทินงวด', () => {
  it('ปีหนึ่งมี 24 งวด วันที่ 1 และ 16 ของทุกเดือน', () => {
    const dates = scheduledDrawDates(2026);
    expect(dates).toHaveLength(24);
    expect(dates[0]).toBe('2026-01-01');
    expect(dates[1]).toBe('2026-01-16');
    expect(dates.at(-1)).toBe('2026-12-16');
  });

  it('เรียงจากต้นปีไปท้ายปีเสมอ', () => {
    const dates = scheduledDrawDates(2027);
    expect(dates).toEqual([...dates].sort());
  });

  it('ปีต้องเป็นจำนวนเต็มบวก', () => {
    expect(() => scheduledDrawDates(0)).toThrow();
  });
});

describe('งวดถัดไป', () => {
  it('นับวันนั้นด้วยถ้าเป็นวันออกรางวัล', () => {
    expect(nextDrawDate('2026-09-16')).toBe('2026-09-16');
  });

  it('ข้ามไปงวดถัดไปเมื่อเลยวันออกรางวัลแล้ว', () => {
    expect(nextDrawDate('2026-09-17')).toBe('2026-10-01');
  });

  it('ข้ามปีได้', () => {
    expect(upcomingDrawDates('2026-12-17', 2)).toEqual(['2027-01-01', '2027-01-16']);
  });

  it('คืนตามจำนวนที่ขอ', () => {
    expect(upcomingDrawDates('2026-01-01', 3)).toEqual(['2026-01-01', '2026-01-16', '2026-02-01']);
  });

  it('วันที่ผิดรูปแบบเป็นข้อผิดพลาด', () => {
    expect(() => upcomingDrawDates('2026-02-30', 1)).toThrow();
    expect(() => upcomingDrawDates('2026-01-01', 0)).toThrow();
  });
});

describe('งวดที่เลื่อน', () => {
  it('วันที่ไม่มีประกาศเลื่อน คืนวันเดิม', () => {
    expect(actualDrawDate('2026-05-01')).toBe('2026-05-01');
  });

  it('ทุกงวดที่บันทึกว่าเลื่อน ต้องมีที่มาและวันที่ถูกรูปแบบ', () => {
    for (const c of DRAW_DATE_CHANGES) {
      expect(c.scheduled).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.actual).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.source.trim().length).toBeGreaterThan(0);
      expect(actualDrawDate(c.scheduled)).toBe(c.actual);
    }
  });
});
