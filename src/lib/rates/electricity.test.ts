import { describe, it, expect } from 'vitest';
import {
  calculateBill,
  FT_PERIODS,
  ftAt,
  latestFt,
  RESIDENTIAL_TARIFFS,
  residentialTariffsAt,
  VAT,
} from './electricity';

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
    expect(ftAt('2025-12-31')).toBeNull();
    expect(ftAt('2026-02-30')).toBeNull();
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

  it('รวมค่าพลังงานเต็มความละเอียดก่อนปัดเป็นสตางค์', () => {
    const r = calculateBill(137, meaSmall, ft, VAT.rate);
    const sumLines = r.lines.reduce((s, l) => s + l.amount, 0);
    expect(Math.abs(sumLines - r.energyCharge)).toBeLessThan(0.02);
  });

  it('ปฏิเสธหน่วยติดลบและ VAT ติดลบ', () => {
    expect(() => calculateBill(-1, meaSmall, ft, VAT.rate)).toThrow();
    expect(() => calculateBill(100, meaSmall, ft, -0.07)).toThrow();
  });
});

describe('อัตราตามเดือนบิลและการปัดเศษ', () => {
  it('เทียบบิล PEA สิงหาคม 2569 จำนวน 871 หน่วยได้ทุกรายการ', () => {
    const tariff = residentialTariffsAt('pea', '2026-08-01')![1];
    const bill = calculateBill(871, tariff, ftAt('2026-08-01')!.ratePerUnit, VAT.rate);
    expect(bill.lines.map((line) => line.amount)).toEqual([487.26, 1055.45, 2082.62]);
    expect(bill).toMatchObject({
      energyCharge: 3625.33,
      serviceCharge: 24.62,
      ftCharge: 141.36,
      subtotal: 3791.31,
      vat: 265.39,
      total: 4056.7,
    });
    expect(bill.energyCharge + bill.serviceCharge).toBeCloseTo(3649.95, 2);
  });

  it('บิลกันยายนเปลี่ยนเป็นอัตราใหม่โดยไม่เปลี่ยนบิลสิงหาคม', () => {
    for (const utility of ['pea', 'mea'] as const) {
      expect(residentialTariffsAt(utility, '2026-08-31')![1].steps[0]).toEqual({ upTo: 150, ratePerUnit: 3.2484 });
      const tariff = residentialTariffsAt(utility, '2026-09-01')![1];
      expect(calculateBill(871, tariff, 0.1623, VAT.rate).total).toBe(3905.95);
    }
  });

  it('เลือก Ft ตามขอบเขตงวดที่ประกาศ', () => {
    expect(ftAt('2026-04-30')!.ratePerUnit).toBe(0.0972);
    expect(ftAt('2026-05-01')!.ratePerUnit).toBe(0.1623);
    expect(ftAt('2026-08-31')!.ratePerUnit).toBe(0.1623);
  });

  it('ไม่ใช้อัตราปัจจุบันทับวันที่ไม่มีข้อมูลหรือวันที่ไม่ถูกต้อง', () => {
    for (const date of ['2025-12-31', '2027-01-01', '2026-02-30', 'invalid']) {
      expect(residentialTariffsAt('pea', date)).toBeNull();
    }
  });

  it.each([0, 15.5, 137, 150, 200.25, 400, 871, 1234.56])('ยอดรวมตรงกับรายการที่แสดงสำหรับ %s หน่วย', (units) => {
    const bill = calculateBill(units, meaSmall, 0.1623, VAT.rate);
    expect(bill.subtotal).toBe(Number((bill.energyCharge + bill.serviceCharge + bill.ftCharge).toFixed(2)));
    expect(bill.vat).toBe(Number((bill.subtotal * VAT.rate).toFixed(2)));
    expect(bill.total).toBe(Number((bill.subtotal + bill.vat).toFixed(2)));
  });
});
