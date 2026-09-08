import { describe, it, expect } from 'vitest';
import { calculateBill, FT_PERIODS, ftAt, latestFt, RESIDENTIAL_TARIFFS, VAT } from './electricity';

const meaSmall = RESIDENTIAL_TARIFFS.mea[0];
const meaLarge = RESIDENTIAL_TARIFFS.mea[1];

describe('อัตราค่าไฟ', () => {
  it('MEA และ PEA ใช้ตัวเลขเดียวกันในโครงสร้างปัจจุบัน แต่แยก key ไว้', () => {
    expect(RESIDENTIAL_TARIFFS.pea[0].steps).toEqual(RESIDENTIAL_TARIFFS.mea[0].steps);
    expect(RESIDENTIAL_TARIFFS.pea[0].serviceCharge).toBe(RESIDENTIAL_TARIFFS.mea[0].serviceCharge);
    // เงื่อนไขมิเตอร์ต่างกันจริงระหว่างสองการไฟฟ้า
    expect(RESIDENTIAL_TARIFFS.pea[0].eligibility).not.toBe(RESIDENTIAL_TARIFFS.mea[0].eligibility);
  });

  it('อัตราไม่เกิน 150 หน่วย มีขั้นถึง 401 หน่วยขึ้นไปด้วย', () => {
    expect(meaSmall.steps.at(-1)!.upTo).toBe(Infinity);
    expect(meaSmall.steps).toHaveLength(5);
  });

  it('ค่าบริการต่างกันตามอัตราที่ใช้', () => {
    expect(meaSmall.serviceCharge).toBe(8.19);
    expect(meaLarge.serviceCharge).toBe(24.62);
  });
});

describe('ค่า Ft', () => {
  it('งวด ก.ย.–ธ.ค. 2569 = 0.1623 บาท/หน่วย', () => {
    expect(ftAt('2026-09-08')!.ratePerUnit).toBe(0.1623);
    expect(ftAt('2026-12-31')!.ratePerUnit).toBe(0.1623);
  });

  it('วันที่นอกงวดที่บันทึกไว้คืน null ไม่ใช่เดาค่า', () => {
    expect(ftAt('2027-01-15')).toBeNull();
    expect(ftAt('2026-06-15')).toBeNull();
  });

  it('latestFt คืนงวดที่ใหม่ที่สุดที่มีข้อมูล', () => {
    expect(latestFt().effectiveFrom).toBe('2026-09-01');
  });

  it('ทุกงวดมีวันเริ่มและวันสิ้นสุดเรียงถูกต้อง', () => {
    for (const p of FT_PERIODS) expect(p.effectiveFrom < p.effectiveTo).toBe(true);
  });
});

describe('คำนวณบิลค่าไฟ', () => {
  const ft = 0.1623;

  it('ใช้ไฟ 100 หน่วยในอัตราไม่เกิน 150 หน่วย', () => {
    const r = calculateBill(100, meaSmall, ft, VAT.rate);
    // 15×2.3488 + 10×2.9882 + 75×3.0 = 35.232 + 29.882 + 225 = 290.114
    expect(r.energyCharge).toBe(290.11);
    expect(r.serviceCharge).toBe(8.19);
    expect(r.ftCharge).toBe(16.23);
    expect(r.subtotal).toBe(314.53);
    expect(r.total).toBe(336.55);
  });

  it('ใช้ไฟ 350 หน่วยในอัตราเกิน 150 หน่วย ข้ามขั้นถูกต้อง', () => {
    const r = calculateBill(350, meaLarge, ft, VAT.rate);
    // 200×3.0 + 150×4.1584 = 600 + 623.76 = 1223.76
    expect(r.energyCharge).toBe(1223.76);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1].units).toBe(150);
  });

  it('ใช้ไฟเกิน 400 หน่วยเข้าขั้นบนสุด', () => {
    const r = calculateBill(500, meaLarge, ft, VAT.rate);
    expect(r.lines).toHaveLength(3);
    expect(r.lines[2].ratePerUnit).toBe(4.3583);
    expect(r.lines[2].units).toBe(100);
  });

  it('ใช้ไฟ 0 หน่วยยังต้องจ่ายค่าบริการ และไม่หารด้วยศูนย์', () => {
    const r = calculateBill(0, meaSmall, ft, VAT.rate);
    expect(r.energyCharge).toBe(0);
    expect(r.lines).toEqual([]);
    expect(r.total).toBe(8.76);
    expect(r.averagePerUnit).toBe(0);
  });

  it('VAT คิดทับทั้งก้อน ไม่ใช่เฉพาะค่าพลังงาน', () => {
    const r = calculateBill(100, meaSmall, ft, VAT.rate);
    expect(r.vat).toBeCloseTo(r.subtotal * 0.07, 2);
  });

  it('ปัดเศษครั้งเดียวตอนท้าย — ผลรวมของบรรทัดไม่บังคับให้เท่ากับค่าพลังงานที่ปัดแล้วเป๊ะ', () => {
    const r = calculateBill(137, meaSmall, ft, VAT.rate);
    const sumLines = r.lines.reduce((s, l) => s + l.amount, 0);
    expect(Math.abs(sumLines - r.energyCharge)).toBeLessThan(0.02);
  });

  it('ปฏิเสธหน่วยติดลบและ VAT ติดลบ', () => {
    expect(() => calculateBill(-1, meaSmall, ft, VAT.rate)).toThrow();
    expect(() => calculateBill(100, meaSmall, ft, -0.07)).toThrow();
  });
});
