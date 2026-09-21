import { randomInt, type Rng } from '@/lib/random';

export const WHEEL_MIN = 2;
/** เกินนี้ป้ายในวงล้อเล็กจนอ่านไม่ออก — ให้ไปใช้ "สุ่มชื่อ จับฉลาก" แทน */
export const WHEEL_MAX = 20;

/** จำนวนรอบเต็มที่หมุนก่อนหยุด — มากพอให้รู้สึกว่าหมุนจริง ไม่มากจนต้องรอนาน */
const FULL_TURNS = 5;

/**
 * เรขาคณิตของวงล้อ: 0 องศาคือตำแหน่งเข็มที่ด้านบน ช่องเรียงตามเข็มนาฬิกา
 * ช่องที่ i กินมุม [i·step, (i+1)·step) จุดกึ่งกลางจึงอยู่ที่ (i + 0.5)·step
 */
export function segmentCenterAngle(index: number, total: number): number {
  return (index + 0.5) * (360 / total);
}

/** ช่องที่อยู่ใต้เข็ม เมื่อวงล้อถูกหมุนตามเข็มไป rotation องศา */
export function segmentAtPointer(rotation: number, total: number): number {
  const step = 360 / total;
  const angle = (((-rotation % 360) + 360) % 360) / step;
  return Math.floor(angle) % total;
}

export interface SpinPlan {
  /** ช่องผู้ชนะ — ตัดสินก่อนแอนิเมชันเริ่มเสมอ */
  index: number;
  /** มุมสะสมที่จะหมุนไป (องศา) ใช้กับ CSS transform ได้ตรง ๆ */
  rotation: number;
}

/**
 * วางแผนการหมุนหนึ่งครั้ง
 *
 * **ตัดสินผู้ชนะก่อน แล้วค่อยคำนวณมุมให้ไปหยุดตรงช่องนั้น** — ห้ามกลับทิศทางเด็ดขาด
 * การอ่านผลจากมุมที่แอนิเมชันหยุดจริงทำให้ผลเพี้ยนทันทีที่ transition ถูกขัดจังหวะ
 * (สลับแท็บ ปรับขนาดจอ หรือผู้ใช้เปิดโหมดลดการเคลื่อนไหว)
 *
 * `previousRotation` คือมุมสะสมของรอบก่อน — หมุนต่อไปข้างหน้าเสมอ ไม่รีเซ็ตกลับไป 0
 * ซึ่งจะทำให้วงล้อกระตุกย้อนกลับก่อนเริ่มหมุนรอบใหม่
 */
export function planSpin(total: number, previousRotation: number, rng: Rng): SpinPlan {
  if (!Number.isInteger(total) || total < WHEEL_MIN || total > WHEEL_MAX) {
    throw new Error(`วงล้อรองรับ ${WHEEL_MIN}–${WHEEL_MAX} ช่อง`);
  }

  const step = 360 / total;
  const index = randomInt(rng, 0, total - 1);

  // เบี่ยงจุดหยุดออกจากกึ่งกลางช่องเล็กน้อย เพื่อไม่ให้เข็มชี้ตรงกลางเป๊ะทุกครั้งจนดูปลอม
  // ขอบเขต ±0.4·step ทำให้ยังอยู่ในช่องเดิมเสมอ โดยเหลือขอบกันชนข้างละ 0.1·step
  const jitter = (randomInt(rng, 0, 100) / 100 - 0.5) * 0.8 * step;
  const target = ((-(segmentCenterAngle(index, total) + jitter) % 360) + 360) % 360;

  const current = ((previousRotation % 360) + 360) % 360;
  const delta = (((target - current) % 360) + 360) % 360;

  return { index, rotation: previousRotation + FULL_TURNS * 360 + delta };
}

export const WHEEL_RADIUS = 100;

/** เกินจำนวนนี้ป้ายชื่อในวงล้อเล็กจนอ่านไม่ออก จึงแสดงเป็นเลขลำดับแทน */
export const LABEL_LIMIT = 12;

export interface WheelSegment {
  index: number;
  label: string;
  /** เส้นทาง SVG ของช่อง วาดบน viewBox ที่มีจุด 0,0 อยู่กลางวงล้อ */
  path: string;
  /** มุมกึ่งกลางช่อง ใช้วางป้ายชื่อ */
  midAngle: number;
}

/** พิกัดบนขอบวงล้อที่มุม deg โดย 0 องศาอยู่ที่ 12 นาฬิกา และเดินตามเข็ม */
function polar(deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return [round(WHEEL_RADIUS * Math.cos(rad)), round(WHEEL_RADIUS * Math.sin(rad))];
}

/**
 * แปลงรายการเป็นช่องของวงล้อ
 *
 * รายการเดียววาดเป็น arc ไม่ได้เพราะจุดเริ่มกับจุดจบทับกันพอดี — คอมโพเนนต์จึงใช้
 * วงกลมเต็มใบแทนตั้งแต่ต้น ไม่ใช่มาดักกรณีนี้ในนี้
 */
export function wheelSegments(entries: readonly string[]): WheelSegment[] {
  const step = 360 / entries.length;
  return entries.map((label, index) => {
    const start = index * step;
    const [x0, y0] = polar(start);
    const [x1, y1] = polar(start + step);
    const largeArc = step > 180 ? 1 : 0;
    return {
      index,
      label,
      midAngle: start + step / 2,
      path: `M0 0L${x0} ${y0}A${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${x1} ${y1}Z`,
    };
  });
}
