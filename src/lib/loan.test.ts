import { describe, it, expect } from 'vitest';
import { amortize, effectiveRateFromPayment, flatLoan, monthlyPayment, payoffSchedule } from './loan';

describe('ค่างวดลดต้นลดดอก', () => {
  it('กู้ 1 ล้าน 5% 20 ปี ได้ค่างวดราว 6,600 บาท', () => {
    expect(monthlyPayment(1_000_000, 0.05, 240)).toBeCloseTo(6599.56, 1);
  });

  it('ดอกเบี้ย 0% หารเงินต้นเท่า ๆ กัน', () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000);
  });

  it('ปฏิเสธเงินต้น/งวดที่ไม่เป็นบวก และอัตราที่กรอกมาเป็นเปอร์เซ็นต์แทนทศนิยม', () => {
    expect(() => monthlyPayment(0, 0.05, 12)).toThrow('เงินต้น');
    expect(() => monthlyPayment(100, 0.05, 0)).toThrow('จำนวนงวด');
    expect(() => monthlyPayment(100, 5, 12)).toThrow('ทศนิยม');
  });
});

describe('ตารางผ่อนลดต้นลดดอก', () => {
  it('ปิดยอดพอดีที่งวดสุดท้าย ไม่เหลือเศษ', () => {
    const r = amortize(1_000_000, [{ months: Infinity, annualRate: 0.05 }], 240);
    expect(r.rows).toHaveLength(240);
    expect(r.rows.at(-1)!.balance).toBe(0);
  });

  it('เงินต้นที่ตัดได้รวมกันเท่ากับเงินต้นที่กู้', () => {
    const r = amortize(500_000, [{ months: Infinity, annualRate: 0.06 }], 60);
    const paidPrincipal = r.rows.reduce((s, x) => s + x.principal, 0);
    expect(paidPrincipal).toBeCloseTo(500_000, 0);
    expect(r.totalPaid).toBeCloseTo(500_000 + r.totalInterest, 0);
  });

  it('ดอกเบี้ยขั้นบันได — ค่างวดคงที่ แต่ตัดเงินต้นได้น้อยลงหลังขึ้นอัตรา', () => {
    const r = amortize(1_000_000, [
      { months: 36, annualRate: 0.03 },
      { months: Infinity, annualRate: 0.065 },
    ], 240);
    expect(r.rows[0].annualRate).toBe(0.03);
    expect(r.rows[35].annualRate).toBe(0.03);
    expect(r.rows[36].annualRate).toBe(0.065);
    expect(r.rows[36].payment).toBe(r.rows[35].payment);
    expect(r.rows[36].principal).toBeLessThan(r.rows[35].principal);
  });

  it('ค่างวดที่คิดจากอัตราโปรฯ ทำให้ผ่อนไม่หมด — ยอดค้างไปโผล่ที่ค่างวดสุดท้าย ไม่ใช่หายไปเงียบ ๆ', () => {
    const stepped = amortize(1_000_000, [
      { months: 36, annualRate: 0.03 },
      { months: Infinity, annualRate: 0.065 },
    ], 240);
    const last = stepped.rows.at(-1)!;
    expect(last.balance).toBe(0);
    expect(last.payment).toBeGreaterThan(stepped.rows[0].payment * 2);
  });

  it('ค่างวดที่กำหนดเองน้อยกว่าดอกเบี้ยของงวด ต้องแจ้งเตือน ไม่ใช่คำนวณต่อ', () => {
    expect(() => amortize(1_000_000, [{ months: Infinity, annualRate: 0.12 }], 240, 1_000))
      .toThrow('หนี้ไม่ลดลง');
  });
});

describe('สินเชื่อดอกเบี้ยคงที่', () => {
  it('รถ 800,000 ดาวน์ 20% ดอกเบี้ยคงที่ 3% 60 งวด', () => {
    const r = flatLoan(800_000, 0.03, 60, 160_000);
    // จัดไฟแนนซ์ 640,000 · ดอกเบี้ย = 640,000 × 3% × 5 ปี = 96,000
    expect(r.totalInterest).toBe(96_000);
    expect(r.totalPaid).toBe(736_000);
    expect(r.monthlyPayment).toBeCloseTo(12_266.67, 1);
  });

  it('ดอกเบี้ยคงที่ 3% เทียบเท่าลดต้นลดดอกราว 5.6% — สูงเกือบสองเท่า', () => {
    const r = flatLoan(640_000, 0.03, 60);
    expect(r.effectiveAnnualRate).toBeGreaterThan(0.05);
    expect(r.effectiveAnnualRate).toBeLessThan(0.06);
  });

  it('ปฏิเสธเงินดาวน์ที่มากกว่าหรือเท่ากับราคาเต็ม', () => {
    expect(() => flatLoan(500_000, 0.03, 48, 500_000)).toThrow('น้อยกว่าราคาเต็ม');
  });
});

describe('แปลงค่างวดกลับเป็นอัตราลดต้นลดดอก', () => {
  it('ย้อนกลับได้ตรงกับอัตราที่ใช้สร้างค่างวด', () => {
    for (const rate of [0.03, 0.05, 0.075, 0.12, 0.28]) {
      const pay = monthlyPayment(1_000_000, rate, 60);
      expect(effectiveRateFromPayment(1_000_000, pay, 60)).toBeCloseTo(rate, 4);
    }
  });

  it('ค่างวดรวมเท่าเงินต้นพอดี = ดอกเบี้ย 0%', () => {
    expect(effectiveRateFromPayment(120_000, 10_000, 12)).toBe(0);
  });

  it('อัตราสูงมากยังลู่เข้าได้ ไม่หลุดเป็น NaN', () => {
    const pay = monthlyPayment(50_000, 0.9, 36);
    expect(effectiveRateFromPayment(50_000, pay, 36)).toBeCloseTo(0.9, 3);
  });

  it('ค่างวดสูงเกินจริงจนไม่มีอัตราที่สมเหตุสมผล ต้องโยน error ไม่ใช่คืนค่ามั่ว', () => {
    expect(() => effectiveRateFromPayment(10_000, 100_000, 12)).toThrow('สูงเกิน');
  });

  it('ปฏิเสธ input ที่ไม่เป็นบวก', () => {
    expect(() => effectiveRateFromPayment(0, 100, 12)).toThrow();
    expect(() => effectiveRateFromPayment(100, 0, 12)).toThrow();
  });
});

describe('หนี้บัตรเครดิต', () => {
  it('หนี้ 50,000 ดอกเบี้ย 16% จ่ายเดือนละ 3,000 หมดใน 19 งวด', () => {
    const r = payoffSchedule(50_000, 0.16, 3_000);
    expect(r.months).toBe(19);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.rows.at(-1)!.balance).toBe(0);
  });

  it('จ่ายมากขึ้นหมดเร็วขึ้นและดอกเบี้ยรวมน้อยลง', () => {
    const slow = payoffSchedule(50_000, 0.16, 3_000);
    const fast = payoffSchedule(50_000, 0.16, 6_000);
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
  });

  it('จ่ายน้อยกว่าดอกเบี้ยงวดแรก = หนี้ไม่มีวันหมด ต้องบอกให้ชัด', () => {
    expect(() => payoffSchedule(100_000, 0.16, 1_000)).toThrow('ไม่ลดลงเลย');
  });

  it('จ่ายเฉียดดอกเบี้ยจนเกินเพดานงวด ต้องแจ้งแทนที่จะวนไม่รู้จบ', () => {
    // 1,340 บาท/เดือน มากกว่าดอกเบี้ยงวดแรก (1,333.33) อยู่ 6.67 บาท จึงหมดได้จริง แต่ใช้เวลา 401 งวด
    expect(payoffSchedule(100_000, 0.16, 1_340).months).toBe(401);
    expect(() => payoffSchedule(100_000, 0.16, 1_340, 300)).toThrow('เกิน 300 เดือน');
  });
});
