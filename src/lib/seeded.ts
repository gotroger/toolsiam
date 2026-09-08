/**
 * การสุ่มแบบกำหนดได้ (deterministic) สำหรับดวงรายวัน (§9.5)
 *
 * ไม่ใช่ Math.random และไม่เรียก AI — ผลลัพธ์ขึ้นกับ seed อย่างเดียว
 * ผู้ใช้คนละเครื่องที่เปิดวันเดียวกันจึงเห็นข้อความเดียวกันเสมอ และรีเฟรชแล้วไม่เปลี่ยน
 * ซึ่งจำเป็นทั้งต่อความน่าเชื่อถือ (ดวงที่เปลี่ยนทุกครั้งที่กดรีเฟรชคือดวงปลอม)
 * และต่อการทดสอบ
 */

/**
 * FNV-1a 32-bit — เล็ก เร็ว และกระจายตัวดีพอสำหรับการเลือก index จาก pool
 * ไม่ใช่ hash เชิงความปลอดภัย และไม่ควรใช้กับอะไรที่ต้องการความลับ
 */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash * 16777619 แบบเลี่ยง overflow ของ 32-bit
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** เลือกหนึ่งรายการจาก pool ตาม seed — pool ว่างถือเป็นข้อผิดพลาดของข้อมูล ไม่ใช่กรณีปกติ */
export function pickBySeed<T>(pool: readonly T[], seed: string): T {
  if (pool.length === 0) throw new Error('pool ต้องมีอย่างน้อยหนึ่งรายการ');
  return pool[hashString(seed) % pool.length];
}

/**
 * เลือกจาก pool ที่ใช้ร่วมกันหลายกลุ่ม โดยรับประกันว่ากลุ่มต่าง ๆ ในวันเดียวกันไม่ได้ข้อความซ้ำกัน
 *
 * ใช้แทนการทำ pool แยกต่อกลุ่ม: pool 60 ข้อความที่ใช้ร่วมกัน 12 ราศี ให้เนื้อหาไม่ซ้ำ 60 วัน
 * ต่อราศีเหมือนกัน แต่เก็บข้อความน้อยกว่า 12 เท่า — ข้อแลกคือต้องกันการชนกันเอง
 *
 * ทำโดยเลื่อน index ไปตามลำดับกลุ่มด้วยระยะที่เป็นจำนวนเฉพาะสัมพัทธ์กับขนาด pool
 * การเลื่อนแบบนี้เป็น bijection บน [0, n) กลุ่มที่ต่างกันจึงได้ index ต่างกันเสมอ
 */
export function pickForGroup<T>(pool: readonly T[], seed: string, groupIndex: number, groupCount: number): T {
  if (pool.length === 0) throw new Error('pool ต้องมีอย่างน้อยหนึ่งรายการ');
  if (!Number.isInteger(groupIndex) || groupIndex < 0) throw new Error('ลำดับกลุ่มต้องเป็นจำนวนเต็มไม่ติดลบ');
  if (!Number.isInteger(groupCount) || groupCount <= 0) throw new Error('จำนวนกลุ่มต้องเป็นจำนวนเต็มบวก');
  if (pool.length < groupCount) {
    throw new Error(`pool ต้องมีอย่างน้อย ${groupCount} รายการ จึงจะแจกให้ทุกกลุ่มโดยไม่ซ้ำกันได้`);
  }

  const n = pool.length;
  const step = coprimeStep(n);
  return pool[(hashString(seed) + groupIndex * step) % n];
}

/** ระยะเลื่อนที่เป็นจำนวนเฉพาะสัมพัทธ์กับ n — เริ่มจากราวครึ่งหนึ่งของ n เพื่อให้กระจายตัวดี */
function coprimeStep(n: number): number {
  if (n === 1) return 1;
  for (let step = Math.max(1, Math.floor(n / 2)); step < n; step++) {
    if (gcd(step, n) === 1) return step;
  }
  return 1;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
