-- รายการโปรดของสมาชิก (docs/superpowers/specs/2026-10-04-favorites-design.md)
--
-- เก็บแค่ว่าใครกดดาวเครื่องมือไหนไว้เมื่อไร — ไม่มีข้อมูลที่ผู้ใช้กรอกในเครื่องมือ
-- created_at เป็น unix seconds เหมือนตารางอื่นของระบบสมาชิก ใช้เรียงใหม่ไปเก่า

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT    NOT NULL REFERENCES users(id),
  tool_slug  TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, tool_slug)
) WITHOUT ROWID;
