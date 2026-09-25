import { describe, it, expect } from 'vitest';
import { calculateTenure, formatTenure } from './logic';
import { calculateSeverance } from '@/tools/finance/severance-pay/logic';

describe('อายุงาน', () => {
  it('นับแบบครบรอบปฏิทิน ไม่ใช่หารด้วย 365', () => {
    const t = calculateTenure('2020-01-01', '2026-01-01');
    expect(t.years).toBe(6);
    expect(t.months).toBe(0);
    expect(t.days).toBe(0);
  });

  it('แยกปี เดือน วัน และบอกยอดรวม', () => {
    const t = calculateTenure('2023-03-15', '2026-09-08');
    expect(t).toMatchObject({ years: 3, months: 5, days: 24 });
    expect(t.totalMonths).toBe(41);
    expect(t.totalDays).toBe(1273);
  });

  it('บอกวันครบรอบปีถัดไปและจำนวนวันที่เหลือ', () => {
    const t = calculateTenure('2023-03-15', '2026-09-08');
    expect(t.nextAnniversary).toBe('2027-03-15');
    expect(t.daysToNextAnniversary).toBe(188);
  });

  it('วันครบรอบของคนเริ่มงาน 29 ก.พ. ตกที่ 28 ก.พ. ในปีที่ไม่ใช่อธิกสุรทิน', () => {
    expect(calculateTenure('2024-02-29', '2024-06-01').nextAnniversary).toBe('2025-02-28');
  });

  it('เริ่มงานวันเดียวกับวันอ้างอิง = 0 วัน', () => {
    const t = calculateTenure('2026-09-08', '2026-09-08');
    expect(t.totalDays).toBe(0);
    expect(formatTenure(t)).toBe('0 วัน');
  });

  it('ปฏิเสธวันเริ่มงานที่อยู่หลังวันอ้างอิง', () => {
    expect(() => calculateTenure('2026-09-09', '2026-09-08')).toThrow('วันเริ่มงาน');
  });
});

describe('ข้อความอายุงาน', () => {
  it('ตัดหน่วยที่เป็นศูนย์ทิ้ง', () => {
    expect(formatTenure(calculateTenure('2020-01-01', '2026-01-01'))).toBe('6 ปี');
    expect(formatTenure(calculateTenure('2026-01-01', '2026-03-01'))).toBe('2 เดือน');
    expect(formatTenure(calculateTenure('2023-03-15', '2026-09-08'))).toBe('3 ปี 5 เดือน 24 วัน');
  });
});

describe('นับวันสุดท้ายที่ทำงานด้วย (ลาออกแล้ว)', () => {
  it('เริ่ม 1 ม.ค. 2566 ทำงานวันสุดท้าย 31 ธ.ค. 2568 = 3 ปีเต็ม ไม่ใช่ 2 ปี 11 เดือน 30 วัน', () => {
    const t = calculateTenure('2023-01-01', '2025-12-31', { includeEndDay: true });
    expect(formatTenure(t)).toBe('3 ปี');
    expect(t.totalDays).toBe(1096);
  });

  it('ตรงกับการนับอายุงานของเครื่องมือค่าชดเชย', () => {
    for (const [start, end] of [
      ['2023-01-01', '2025-12-31'],
      ['2024-02-29', '2025-02-27'],
      ['2020-06-15', '2026-06-14'],
      ['2026-09-08', '2026-09-08'],
    ]) {
      const t = calculateTenure(start, end, { includeEndDay: true });
      const s = calculateSeverance({ monthlySalary: 30_000, startDate: start, endDate: end, divisor: 30 });
      expect(t.totalDays).toBe(s.tenureDays);
      expect(t.years).toBe(s.tenureYears);
    }
  });

  it('ทำงานวันเดียว = 1 วัน', () => {
    expect(formatTenure(calculateTenure('2026-09-08', '2026-09-08', { includeEndDay: true }))).toBe('1 วัน');
  });

  it('ค่าตั้งต้นยังนับแบบครบรอบ (ยังทำงานอยู่ถึงวันนี้)', () => {
    expect(formatTenure(calculateTenure('2023-01-01', '2025-12-31'))).toBe('2 ปี 11 เดือน 30 วัน');
  });
});
