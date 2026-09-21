import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import { planSpin, segmentAtPointer, segmentCenterAngle, wheelSegments, WHEEL_MAX, WHEEL_MIN } from './logic';

const rng = () => seededRng('วงล้อ');

describe('segmentCenterAngle', () => {
  it('ช่องแรกของวงล้อ 4 ช่อง มีจุดกึ่งกลางที่ 45 องศา', () => {
    expect(segmentCenterAngle(0, 4)).toBe(45);
    expect(segmentCenterAngle(3, 4)).toBe(315);
  });
});

describe('planSpin', () => {
  it('มุมปลายทางชี้ไปยังช่องผู้ชนะจริง — ทุกจำนวนช่องที่รองรับ', () => {
    for (let total = WHEEL_MIN; total <= WHEEL_MAX; total++) {
      const r = rng();
      for (let attempt = 0; attempt < 30; attempt++) {
        const { index, rotation } = planSpin(total, 0, r);
        expect(segmentAtPointer(rotation, total)).toBe(index);
      }
    }
  });

  it('หมุนต่อจากมุมเดิมก็ยังชี้ถูกช่อง — สะสมมุมข้ามการหมุนหลายรอบ', () => {
    const r = rng();
    let rotation = 0;
    for (let i = 0; i < 40; i++) {
      const plan = planSpin(7, rotation, r);
      expect(segmentAtPointer(plan.rotation, 7)).toBe(plan.index);
      rotation = plan.rotation;
    }
  });

  it('หมุนไปข้างหน้าเสมอ อย่างน้อยหลายรอบเต็ม — ไม่กระตุกถอยหลัง', () => {
    const r = rng();
    let rotation = 0;
    for (let i = 0; i < 10; i++) {
      const plan = planSpin(6, rotation, r);
      expect(plan.rotation).toBeGreaterThan(rotation + 360);
      rotation = plan.rotation;
    }
  });

  it('ทุกช่องมีโอกาสถูกเลือก', () => {
    const r = rng();
    const seen = new Set<number>();
    let rotation = 0;
    for (let i = 0; i < 400; i++) {
      const plan = planSpin(5, rotation, r);
      seen.add(plan.index);
      rotation = plan.rotation;
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('จำนวนช่องนอกช่วงที่รองรับเป็นข้อผิดพลาด', () => {
    expect(() => planSpin(WHEEL_MIN - 1, 0, rng())).toThrow();
    expect(() => planSpin(WHEEL_MAX + 1, 0, rng())).toThrow();
  });

  it('seed เดิมให้ผู้ชนะคนเดิม', () => {
    expect(planSpin(8, 0, seededRng('K7M2')).index).toBe(planSpin(8, 0, seededRng('K7M2')).index);
  });
});

describe('segmentAtPointer', () => {
  it('ยังไม่หมุนเลย เข็มชี้ช่องแรก', () => {
    expect(segmentAtPointer(0, 4)).toBe(0);
  });

  it('หมุนทวนเข็ม (มุมติดลบ) ยังคำนวณช่องได้ถูก', () => {
    // หมุน -45 องศา → จุดที่เคยอยู่ 45 องศามาอยู่ใต้เข็ม = ช่องที่ 0 ของวงล้อ 4 ช่อง
    expect(segmentAtPointer(-45, 4)).toBe(0);
  });
});

describe('wheelSegments', () => {
  it('ได้ช่องเท่าจำนวนรายการ และมุมกึ่งกลางห่างกันเท่า ๆ กัน', () => {
    for (let total = WHEEL_MIN; total <= WHEEL_MAX; total++) {
      const entries = Array.from({ length: total }, (_, i) => `ช่อง ${i}`);
      const segments = wheelSegments(entries);
      expect(segments).toHaveLength(total);
      for (let i = 1; i < total; i++) {
        expect(segments[i].midAngle - segments[i - 1].midAngle).toBeCloseTo(360 / total, 6);
      }
    }
  });

  it('มุมกึ่งกลางตรงกับที่ segmentCenterAngle คำนวณ — เรขาคณิตกับการตัดสินผลต้องใช้สูตรเดียวกัน', () => {
    const segments = wheelSegments(['ก', 'ข', 'ค', 'ง', 'จ']);
    for (const segment of segments) {
      expect(segment.midAngle).toBeCloseTo(segmentCenterAngle(segment.index, 5), 6);
    }
  });

  it('เส้นทางเป็นรูปเสี้ยววงกลมที่ปิดสนิท และเริ่มจากจุดศูนย์กลาง', () => {
    for (const segment of wheelSegments(['ก', 'ข', 'ค'])) {
      expect(segment.path.startsWith('M0 0L')).toBe(true);
      expect(segment.path.endsWith('Z')).toBe(true);
    }
  });

  it('ช่องแรกเริ่มที่ 12 นาฬิกาพอดี', () => {
    expect(wheelSegments(['ก', 'ข', 'ค', 'ง'])[0].path.startsWith('M0 0L0 -100')).toBe(true);
  });

  it('ช่องที่กว้างเกินครึ่งวงใช้ largeArc = 1 — ไม่งั้น SVG วาดเสี้ยวผิดด้าน', () => {
    expect(wheelSegments(['ก', 'ข'])[0].path).toContain(' 0 0 1 ');
    expect(wheelSegments(['ก'])[0].path).toContain(' 0 1 1 ');
  });
});
