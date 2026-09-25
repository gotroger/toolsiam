import { DAY } from './plan';

/**
 * ชั้นเก็บข้อมูลของระบบสมาชิก — interface เดียว สอง implementation
 *   d1Store()     ใช้จริงบน Worker
 *   memoryStore() ใช้ในเทสต์ (memory-store.ts) จะได้ทดสอบ handler โดยไม่ต้องจำลอง SQL
 *
 * เวลาเป็น unix seconds ทั้งหมด
 */
export interface User {
  id: string;
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export type PaymentStatus = 'pending' | 'paid' | 'expired';

export interface Payment {
  id: string;
  userId: string;
  amountSatang: number;
  /** จำนวนวันที่จะได้เมื่อจ่ายสำเร็จ — เก็บตั้งแต่สร้างรายการ ราคา/แพ็กเปลี่ยนทีหลังจึงไม่กระทบของเก่า */
  days: number;
  status: PaymentStatus;
  beamChargeId: string | null;
  /** QR หมดอายุเมื่อไร — เลยแล้วยังไม่จ่าย = expired (ตรวจแบบ lazy ตอน poll) */
  qrExpiresAt: number;
  /** ภาพ QR (PNG base64) และ payload EMVCo เก็บไว้ให้ poll ซ้ำได้โดยไม่ต้องขอ Beam ใหม่ */
  qrImage: string | null;
  qrRaw: string | null;
  createdAt: number;
  paidAt: number | null;
}

export interface GoogleUpsert {
  googleSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface SettleResult {
  /** false = จ่ายไปแล้วก่อนหน้า (webhook ซ้ำ) — ไม่บวกวันเพิ่ม */
  applied: boolean;
  expiresAt: number | null;
}

/**
 * สถานะที่ยัง settle ได้ — รวม `expired` ด้วยโดยตั้งใจ
 *
 * QR ถูกปิดเป็น `expired` แบบ lazy ตอนผู้ใช้ poll ซึ่งอิงนาฬิกาฝั่งเรา แต่เงินที่โอนแล้ว
 * คือเงินที่โอนแล้ว: ถ้าผู้ใช้สแกนจ่ายวินาทีท้าย ๆ แล้ว webhook ของ Beam มาถึงหลังเราปิดรายการไปแล้ว
 * การยืนยันแค่ `pending` จะทำให้ "จ่ายเงินแล้วไม่ได้สิทธิ์" ซึ่งแย่กว่าการให้สิทธิ์ช้าไปเล็กน้อย
 * (Beam ส่ง `charge.succeeded` ต่อเมื่อเก็บเงินได้จริง และการบวกวันยังกันซ้ำด้วย `status = 'paid'` เหมือนเดิม)
 */
const SETTLEABLE = "'pending', 'expired'";

export interface MembershipStore {
  upsertUserFromGoogle(p: GoogleUpsert, now: number, newId: () => string): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getExpiresAt(userId: string): Promise<number | null>;
  createPayment(p: Omit<Payment, 'status' | 'paidAt'>): Promise<void>;
  attachCharge(
    id: string,
    p: { beamChargeId: string; qrImage: string; qrRaw: string; qrExpiresAt: number },
  ): Promise<void>;
  getPayment(id: string): Promise<Payment | null>;
  findPaymentByChargeId(chargeId: string): Promise<Payment | null>;
  /** pending ที่ QR ยังไม่หมดอายุ ณ `now` — ใช้ซ้ำแทนการสร้าง charge ใหม่ทุกครั้งที่กดปุ่ม */
  latestPendingPayment(userId: string, now: number): Promise<Payment | null>;
  /** ประวัติการชำระเงินของผู้ใช้ ใหม่ไปเก่า — ใช้ index payments_user_created */
  listPayments(userId: string, limit: number): Promise<Payment[]>;
  expirePayment(id: string): Promise<void>;
  /**
   * atomic: payments → paid และ subscriptions.expires_at = max(now, เดิม) + payments.days (คำนวณใน SQL)
   * ทำงานกับ status ใน SETTLEABLE (pending หรือ expired) — เรียกซ้ำกี่ครั้งก็บวกวันครั้งเดียว
   */
  settlePayment(
    id: string,
    p: { beamChargeId: string | null; rawWebhookJson: string; now: number },
  ): Promise<SettleResult>;
}

interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}
interface PaymentRow {
  id: string;
  user_id: string;
  amount_satang: number;
  days: number;
  status: PaymentStatus;
  beam_charge_id: string | null;
  qr_expires_at: number;
  qr_image: string | null;
  qr_raw: string | null;
  created_at: number;
  paid_at: number | null;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  googleSub: r.google_sub,
  email: r.email,
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
});
const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  userId: r.user_id,
  amountSatang: r.amount_satang,
  days: r.days,
  status: r.status,
  beamChargeId: r.beam_charge_id,
  qrExpiresAt: r.qr_expires_at,
  qrImage: r.qr_image,
  qrRaw: r.qr_raw,
  createdAt: r.created_at,
  paidAt: r.paid_at,
});

const USER_COLS = 'id, google_sub, email, display_name, avatar_url';
const PAYMENT_COLS =
  'id, user_id, amount_satang, days, status, beam_charge_id, qr_expires_at, qr_image, qr_raw, created_at, paid_at';

export function d1Store(db: D1Database): MembershipStore {
  return {
    async upsertUserFromGoogle(p, now, newId) {
      // google_sub เป็นตัวระบุตัวตน อีเมล/ชื่อ/รูปอัปเดตตามที่ Google ส่งมาล่าสุด
      await db
        .prepare(
          `INSERT INTO users (id, google_sub, email, display_name, avatar_url, created_at, last_login_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
           ON CONFLICT (google_sub) DO UPDATE SET
             email = excluded.email, display_name = excluded.display_name,
             avatar_url = excluded.avatar_url, last_login_at = excluded.last_login_at`,
        )
        .bind(newId(), p.googleSub, p.email, p.displayName, p.avatarUrl, now)
        .run();
      const row = await db
        .prepare(`SELECT ${USER_COLS} FROM users WHERE google_sub = ?1`)
        .bind(p.googleSub)
        .first<UserRow>();
      if (!row) throw new Error('upsert users แล้วอ่านกลับไม่เจอ');
      return toUser(row);
    },

    async getUser(id) {
      const row = await db.prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?1`).bind(id).first<UserRow>();
      return row ? toUser(row) : null;
    },

    async getExpiresAt(userId) {
      const row = await db
        .prepare('SELECT expires_at FROM subscriptions WHERE user_id = ?1')
        .bind(userId)
        .first<{ expires_at: number }>();
      return row ? row.expires_at : null;
    },

    async createPayment(p) {
      await db
        .prepare(
          `INSERT INTO payments (id, user_id, amount_satang, days, status, beam_charge_id, qr_expires_at, qr_image, qr_raw, created_at)
           VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?9)`,
        )
        .bind(p.id, p.userId, p.amountSatang, p.days, p.beamChargeId, p.qrExpiresAt, p.qrImage, p.qrRaw, p.createdAt)
        .run();
    },

    async attachCharge(id, p) {
      await db
        .prepare(
          'UPDATE payments SET beam_charge_id = ?2, qr_image = ?3, qr_raw = ?4, qr_expires_at = ?5 WHERE id = ?1',
        )
        .bind(id, p.beamChargeId, p.qrImage, p.qrRaw, p.qrExpiresAt)
        .run();
    },

    async getPayment(id) {
      const row = await db.prepare(`SELECT ${PAYMENT_COLS} FROM payments WHERE id = ?1`).bind(id).first<PaymentRow>();
      return row ? toPayment(row) : null;
    },

    async findPaymentByChargeId(chargeId) {
      const row = await db
        .prepare(`SELECT ${PAYMENT_COLS} FROM payments WHERE beam_charge_id = ?1`)
        .bind(chargeId)
        .first<PaymentRow>();
      return row ? toPayment(row) : null;
    },

    async latestPendingPayment(userId, now) {
      const row = await db
        .prepare(
          `SELECT ${PAYMENT_COLS} FROM payments
           WHERE user_id = ?1 AND status = 'pending' AND qr_expires_at > ?2
           ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(userId, now)
        .first<PaymentRow>();
      return row ? toPayment(row) : null;
    },

    async listPayments(userId, limit) {
      const { results } = await db
        .prepare(`SELECT ${PAYMENT_COLS} FROM payments WHERE user_id = ?1 ORDER BY created_at DESC LIMIT ?2`)
        .bind(userId, limit)
        .all<PaymentRow>();
      return (results ?? []).map(toPayment);
    },

    async expirePayment(id) {
      await db.prepare(`UPDATE payments SET status = 'expired' WHERE id = ?1 AND status = 'pending'`).bind(id).run();
    },

    async settlePayment(id, p) {
      const payment = await this.getPayment(id);
      if (!payment) return { applied: false, expiresAt: null };
      // batch = transaction เดียว · ทั้งสอง statement ใช้เงื่อนไข SETTLEABLE ชุดเดียวกัน
      // webhook ซ้ำที่มาพร้อมกันจึงบวกวันได้แค่ครั้งเดียว
      //
      // วันหมดอายุใหม่ต้องคำนวณใน SQL จากค่าในแถว ณ ตอนเขียน (= extendExpiry แบบ atomic)
      // ถ้าอ่านค่าเดิมมาคำนวณใน JS ก่อน batch สองรายการคนละใบของคนเดียวกันที่ settle พร้อมกัน
      // จะอ่านค่าเดิมชุดเดียวกัน แล้วรายการที่เขียนทีหลังทับวันของอีกรายการหาย (lost update)
      const results = await db.batch([
        db
          .prepare(
            `INSERT INTO subscriptions (user_id, expires_at, updated_at)
             SELECT ?1, ?2 + ?3, ?2 WHERE EXISTS (SELECT 1 FROM payments WHERE id = ?4 AND status IN (${SETTLEABLE}))
             ON CONFLICT (user_id) DO UPDATE SET
               expires_at = MAX(subscriptions.expires_at, ?2) + ?3, updated_at = excluded.updated_at`,
          )
          .bind(payment.userId, p.now, payment.days * DAY, id),
        db
          .prepare(
            `UPDATE payments SET status = 'paid', beam_charge_id = ?2, paid_at = ?3, raw_webhook_json = ?4
             WHERE id = ?1 AND status IN (${SETTLEABLE})`,
          )
          .bind(id, p.beamChargeId, p.now, p.rawWebhookJson),
      ]);
      const applied = (results[1]?.meta?.changes ?? 0) > 0;
      // อ่านกลับหลังเขียน — ค่าจริงในแถว ไม่ว่ารายการนี้จะเป็นตัวที่บวกวันหรือไม่
      return { applied, expiresAt: await this.getExpiresAt(payment.userId) };
    },
  };
}
