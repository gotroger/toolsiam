import { describe, it, expect } from 'vitest';
import { daysBetween, describeResult, shiftAndDescribe } from './logic';

describe('บรรยายวันที่ผลลัพธ์', () => {
  it('บอกวันในสัปดาห์และปี พ.ศ. เป็นภาษาไทยเต็ม', () => {
    const r = describeResult('2026-09-08');
    expect(r.fullThai).toBe('วันอังคารที่ 8 กันยายน พ.ศ. 2569');
    expect(r.weekdayName).toBe('อังคาร');
    expect(r.buddhistYear).toBe(2569);
    expect(r.isWeekend).toBe(false);
  });

  it('รู้ว่าวันไหนเป็นเสาร์-อาทิตย์', () => {
    expect(describeResult('2026-09-12').isWeekend).toBe(true);
    expect(describeResult('2026-09-13').isWeekend).toBe(true);
  });
});

describe('บวก/ลบวันที่', () => {
  it('อีก 90 วันจาก 8 ก.ย. 2026', () => {
    expect(shiftAndDescribe('2026-09-08', 90, 'day', 1).date).toBe('2026-12-07');
  });

  it('90 วันที่แล้ว', () => {
    expect(shiftAndDescribe('2026-09-08', 90, 'day', -1).date).toBe('2026-06-10');
  });

  it('บวกเดือนแล้วหนีบสิ้นเดือน', () => {
    expect(shiftAndDescribe('2026-01-31', 1, 'month', 1).date).toBe('2026-02-28');
  });

  it('บวกแล้วลบกลับได้วันเดิมเมื่อไม่ชนสิ้นเดือน', () => {
    const forward = shiftAndDescribe('2026-05-15', 7, 'week', 1).date;
    expect(shiftAndDescribe(forward, 7, 'week', -1).date).toBe('2026-05-15');
  });

  it('ปฏิเสธจำนวนติดลบ เพราะทิศทางเลือกแยกต่างหาก', () => {
    expect(() => shiftAndDescribe('2026-09-08', -5, 'day', 1)).toThrow('ไม่ติดลบ');
  });
});

describe('นับวันระหว่างสองวันที่', () => {
  it('re-export daysBetween มาใช้ได้ตรง ๆ', () => {
    expect(daysBetween('2026-01-01', '2026-01-31').days).toBe(30);
  });
});
