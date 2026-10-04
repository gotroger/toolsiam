-- ตัวนับการใช้งานเครื่องมือ (docs/superpowers/specs/2026-09-10-usage-counter-design.md)
--
-- หนึ่งแถว = ยอดของหนึ่งเครื่องมือในหนึ่งวัน (day เป็น YYYY-MM-DD ตามเวลา Asia/Bangkok)
-- ไม่มี IP ไม่มี user agent ไม่มีคุกกี้ ไม่มีตัวระบุผู้ใช้ — เป็นยอดรวมล้วน
-- ใช้ DB ตัวเดียวกับระบบสมาชิกแทนการสร้าง D1 แยก (runbook ข้อ F)

CREATE TABLE IF NOT EXISTS usage_daily (
  slug  TEXT    NOT NULL,
  day   TEXT    NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  uses  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (slug, day)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS usage_daily_day ON usage_daily (day);
