-- ระบบสมาชิก Google + พรีเมียม (docs/superpowers/specs/2026-09-19-membership-premium-design.md)
-- เวลาทุกช่องเป็น unix seconds · ไม่มีตารางไหนเก็บข้อมูลที่ผู้ใช้กรอกในเครื่องมือ
--
-- รัน: npx wrangler d1 migrations apply toolsiam --local   (dev)
--      npx wrangler d1 migrations apply toolsiam --remote  (CI ทำให้ก่อน deploy)

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  google_sub    TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

-- พรีเมียม = expires_at > now คำนวณตอน request ไม่มี cron มาแก้ row
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id    TEXT PRIMARY KEY REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id),
  amount_satang    INTEGER NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  beam_charge_id   TEXT UNIQUE,
  qr_expires_at    INTEGER NOT NULL,
  qr_image         TEXT,
  qr_raw           TEXT,
  created_at       INTEGER NOT NULL,
  paid_at          INTEGER,
  raw_webhook_json TEXT
);

CREATE INDEX IF NOT EXISTS payments_user_created ON payments (user_id, created_at DESC);
