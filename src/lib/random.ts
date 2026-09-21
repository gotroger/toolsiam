/**
 * การสุ่มจริงตามคำสั่งผู้ใช้ (หมวด random)
 *
 * อยู่คนละหน้าที่กับ [seeded.ts](./seeded.ts) และไม่แทนที่กัน:
 *   seeded.ts  = เลือกเนื้อหาตามวัน ผลต้องไม่เปลี่ยนเมื่อรีเฟรช (ดวงรายวัน §9.5)
 *   random.ts  = สุ่มใหม่ทุกครั้งที่ผู้ใช้กดปุ่ม
 * สิ่งเดียวที่ใช้ร่วมกันคือ hashString ที่เอามาตั้งต้น PRNG ของโหมด seed
 *
 * กฎการใช้งานสองข้อที่ห้ามพลาด:
 *   1. logic.ts ของเครื่องมือต้อง **รับ Rng เข้ามา** ไม่เรียก cryptoRng() เอง — จึงทดสอบผลได้เป๊ะ
 *   2. cryptoRng() เรียกได้เฉพาะใน event handler เท่านั้น ห้ามเรียกตอน module scope หรือระหว่าง
 *      render เพราะ Astro import โมดูลของ island ตอน SSR ด้วย ซึ่งไม่มี crypto ของเบราว์เซอร์
 */
import { hashString } from './seeded';

/**
 * คืนจำนวนเต็มไม่มีเครื่องหมาย 32 บิต — ไม่ใช่ float ใน [0,1) อย่างที่ Math.random ทำ
 * เพราะ randomInt ต้องการบิตดิบเพื่อตัด modulo bias ทิ้งได้อย่างถูกต้อง
 */
export type Rng = () => number;

const UINT32_COUNT = 0x1_0000_0000;

/** ขนาด buffer ที่ขอจาก crypto ต่อรอบ — ขอเป็นชุดเพราะเรียกทีละค่าช้ากว่ามาก */
const CRYPTO_BUFFER_SIZE = 256;

/**
 * RNG จากตัวสร้างเลขสุ่มของระบบ — ใช้เมื่อผู้ใช้ไม่ได้ระบุ seed
 * ต้องเรียกในเบราว์เซอร์หรือ Node 19+ เท่านั้น (ดูกฎข้อ 2 ด้านบน)
 */
export function cryptoRng(): Rng {
  const buf = new Uint32Array(CRYPTO_BUFFER_SIZE);
  let next = buf.length; // บังคับให้เติม buffer ในการเรียกครั้งแรก
  return () => {
    if (next >= buf.length) {
      crypto.getRandomValues(buf);
      next = 0;
    }
    return buf[next++];
  };
}

/**
 * RNG จาก seed ที่ผู้ใช้กรอก — seed เดิมให้ผลเดิมเสมอ จึงตรวจสอบการจับฉลากย้อนหลังได้
 *
 * ใช้ sfc32 ที่มี state 128 บิต ไม่ใช่ mulberry32 ที่มี 32 บิต เพราะ state 32 บิตให้สตรีมได้
 * มากที่สุด 2^32 แบบ ขณะที่รายชื่อ 13 คนมีการเรียงสลับ 13! ≈ 6.2 พันล้านแบบ ซึ่งมากกว่านั้น
 * — การเรียงบางแบบจะสุ่มไม่ออกเลย ซึ่งขัดกับสิ่งที่เครื่องมือจับฉลากรับปากไว้
 *
 * ไม่ใช่ตัวสร้างเลขสุ่มเชิงความปลอดภัย — ห้ามใช้กับรหัสผ่านหรืออะไรที่ต้องเป็นความลับ
 */
export function seededRng(seed: string): Rng {
  let a = salted('a', seed);
  let b = salted('b', seed);
  let c = salted('c', seed);
  let d = salted('d', seed);

  const step = () => {
    const t = (a + b) >>> 0;
    a = (b ^ (b >>> 9)) >>> 0;
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    d = (d + 1) >>> 0;
    const out = (t + d) >>> 0;
    c = (c + out) >>> 0;
    return out;
  };

  // อุ่นเครื่อง — ไม่งั้น seed ที่ต่างกันแค่ตัวอักษรเดียวจะให้ค่าแรก ๆ ใกล้เคียงกัน
  for (let i = 0; i < 12; i++) step();
  return step;
}

/** state ทั้งสี่ตัวต้องไม่เป็นศูนย์พร้อมกัน — hashString คืน 0 ได้ในทางทฤษฎี */
function salted(salt: string, seed: string): number {
  return hashString(`${salt}|${seed}`) || 0x9e3779b9;
}

/**
 * จำนวนเต็มสุ่มในช่วง [min, max] **แบบไม่เอนเอียง**
 *
 * การทำ `rng() % range` เฉย ๆ ทำให้เลขต้นช่วงออกบ่อยกว่า เพราะ 2^32 หารด้วย range ไม่ลงตัว
 * — ยอมรับไม่ได้กับเครื่องมือที่ขายความเป็นธรรมของการจับฉลาก จึงตัดค่าที่ตกหางทิ้งแล้วสุ่มใหม่
 */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) throw new Error('ขอบเขตต้องเป็นจำนวนเต็ม');
  if (min > max) throw new Error('ค่าต่ำสุดต้องไม่มากกว่าค่าสูงสุด');

  const range = max - min + 1;
  if (range > UINT32_COUNT) throw new Error('ช่วงกว้างเกินกว่าที่สุ่มได้ในครั้งเดียว');
  if (range === 1) return min;

  const limit = Math.floor(UINT32_COUNT / range) * range;
  // โอกาสที่ค่าจะตกหางติดกัน 200 ครั้งต่ำกว่า 2^-200 — ถึงตรงนี้คือ Rng ที่ส่งมาพัง ไม่ใช่โชคร้าย
  // ถ้าปล่อยเป็น while ล้วน Rng ปลอมที่คืนค่าคงที่จะทำให้วนไม่จบและแขวนทั้งหน้า
  for (let tries = 0; tries < 200; tries++) {
    const x = rng();
    if (x < limit) return min + (x % range);
  }
  throw new Error('แหล่งสุ่มไม่คืนค่าที่ใช้ได้ — ตรวจ Rng ที่ส่งเข้ามา');
}

/** สลับลำดับด้วย Fisher–Yates — คืนอาร์เรย์ใหม่ ไม่แก้ของเดิม */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * สุ่ม n รายการ **โดยไม่ซ้ำ** — Fisher–Yates แบบหยุดกลางทาง จึงไม่ต้องสลับทั้งกองเมื่อขอไม่กี่ตัว
 * และไม่มีปัญหาวนสุ่มไม่จบเหมือนวิธี "สุ่มแล้วเช็กว่าเคยได้ไหม"
 */
export function sample<T>(items: readonly T[], n: number, rng: Rng): T[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('จำนวนที่สุ่มต้องเป็นจำนวนเต็มไม่ติดลบ');
  if (n > items.length) throw new Error(`สุ่มแบบไม่ซ้ำได้มากที่สุด ${items.length} รายการ`);

  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const j = randomInt(rng, i, pool.length - 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
    out.push(pool[i]);
  }
  return out;
}

/** สุ่ม n รายการแบบซ้ำได้ — ขอมากกว่าจำนวนที่มีก็ได้ */
export function sampleWithReplacement<T>(items: readonly T[], n: number, rng: Rng): T[] {
  if (items.length === 0) throw new Error('ต้องมีอย่างน้อยหนึ่งรายการ');
  if (!Number.isInteger(n) || n < 0) throw new Error('จำนวนที่สุ่มต้องเป็นจำนวนเต็มไม่ติดลบ');

  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[randomInt(rng, 0, items.length - 1)]);
  return out;
}

/** ตัวอักษรของ seed — ตัด 0 O 1 I L ออก เพราะ seed ต้องอ่านจากจอแล้วพิมพ์ต่อได้ไม่ผิด */
const SEED_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** seed ใหม่ที่อ่านออกและบอกต่อด้วยปากได้ เช่น "K7M2-QX4P" */
export function newSeed(): string {
  const rng = cryptoRng();
  const block = () =>
    Array.from({ length: 4 }, () => SEED_ALPHABET[randomInt(rng, 0, SEED_ALPHABET.length - 1)]).join('');
  return `${block()}-${block()}`;
}

export interface ResolvedDraw {
  rng: Rng;
  /** seed ที่ใช้จริง — ต้องแสดงให้ผู้ใช้เห็นทุกครั้ง ไม่งั้นคำว่า "ตรวจย้อนหลังได้" ไม่มีความหมาย */
  seed: string;
}

/**
 * นโยบายการสุ่มของทั้งหมวด: **ทุกครั้ง** ที่สุ่ม ต้องรู้ว่าใช้ seed อะไร
 *
 * เลือกแบบนี้แทนการทำ seed เป็นโหมดเสริมที่ต้องติ๊กเปิด เพราะการจับฉลากที่ตรวจย้อนได้
 * เฉพาะตอนที่ผู้ใช้นึกได้ว่าต้องเปิดสวิตช์ก่อน คือการจับฉลากที่ตรวจย้อนไม่ได้ในทางปฏิบัติ
 * เอนโทรปียังมาจาก crypto เหมือนเดิม เพียงแต่ไปอยู่ที่ขั้นตอนปั่น seed แทน
 *
 * ไม่ใช้กับรหัสผ่าน — ดูเหตุผลที่ password-generator/logic.ts
 */
export function resolveDraw(seedInput: string): ResolvedDraw {
  const seed = seedInput.trim().toUpperCase() || newSeed();
  return { rng: seededRng(seed), seed };
}
