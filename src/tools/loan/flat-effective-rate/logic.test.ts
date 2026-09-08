import { describe, it, expect } from 'vitest';
import { effectiveToFlat, flatToEffective, fromPayment } from './logic';

describe('แปลงอัตราคงที่เป็นลดต้นลดดอก', () => {
  it('คงที่ 3% 60 งวด ≈ ลดต้นลดดอก 5.6% — สูงเกือบสองเท่า', () => {
    const r = flatToEffective(600_000, 0.03, 60);
    expect(r.effectiveRate).toBeGreaterThan(0.055);
    expect(r.effectiveRate).toBeLessThan(0.058);
    expect(r.multiple).toBeGreaterThan(1.8);
  });

  it('สัญญายิ่งยาว ส่วนต่างยิ่งกว้าง', () => {
    const short = flatToEffective(600_000, 0.03, 12);
    const long = flatToEffective(600_000, 0.03, 84);
    expect(long.multiple).toBeGreaterThan(short.multiple);
  });

  it('อัตรา 0% ทั้งสองแบบเท่ากันที่ 0 และไม่หารด้วยศูนย์', () => {
    const r = flatToEffective(600_000, 0, 60);
    expect(r.effectiveRate).toBe(0);
    expect(r.multiple).toBe(0);
  });
});

describe('แปลงลดต้นลดดอกเป็นอัตราคงที่', () => {
  it('ย้อนกลับได้ใกล้เคียงกับทิศทางแรก', () => {
    const forward = flatToEffective(600_000, 0.03, 60);
    const back = effectiveToFlat(600_000, forward.effectiveRate, 60);
    expect(back.flatRate).toBeCloseTo(0.03, 4);
  });

  it('ค่างวดของทั้งสองทิศตรงกัน', () => {
    const forward = flatToEffective(600_000, 0.03, 60);
    const back = effectiveToFlat(600_000, forward.effectiveRate, 60);
    expect(back.payment).toBeCloseTo(forward.payment, 0);
  });
});

describe('หาอัตราจากค่างวดที่ไฟแนนซ์เสนอ', () => {
  it('ได้ทั้งอัตราคงที่และอัตราลดต้นลดดอกจากค่างวดเดียว', () => {
    const r = fromPayment(640_000, 12_261.33, 60);
    expect(r.flatRate).toBeCloseTo(0.0299, 4);
    expect(r.effectiveRate).toBeCloseTo(0.0562, 3);
  });

  it('ค่างวดรวมเท่าเงินต้น = ไม่มีดอกเบี้ยทั้งสองแบบ', () => {
    const r = fromPayment(120_000, 10_000, 12);
    expect(r.flatRate).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });

  it('ปฏิเสธค่างวดที่ไม่เป็นบวก', () => {
    expect(() => fromPayment(100_000, 0, 12)).toThrow();
  });
});
