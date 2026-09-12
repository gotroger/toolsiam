import { describe, expect, it } from 'vitest';
import { cleanLink, cleanLinks, MAX_LINES } from './logic';

describe('cleanLink', () => {
  it('ตัด utm_* และ fbclid ออก คงพารามิเตอร์อื่นไว้', () => {
    const r = cleanLink('https://example.com/p?id=5&utm_source=line&utm_medium=chat&fbclid=abc#top');
    expect(r.cleaned).toBe('https://example.com/p?id=5#top');
    expect(r.removed).toEqual(['utm_source', 'utm_medium', 'fbclid']);
    expect(r.ok).toBe(true);
  });

  it('ลิงก์ที่ไม่มีอะไรให้ลบ คืนค่าเดิมทุกตัวอักษร', () => {
    const raw = 'HTTPS://Example.com/A?b=1';
    expect(cleanLink(raw)).toMatchObject({ cleaned: raw, removed: [], ok: true });
  });

  it('youtu.be กลายเป็น watch URL และเก็บ t ไว้', () => {
    expect(cleanLink('https://youtu.be/dQw4w9WgXcQ?si=xyz&t=42').cleaned).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42',
    );
    expect(cleanLink('https://youtu.be/dQw4w9WgXcQ').cleaned).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('youtube.com เก็บเฉพาะ v t list index', () => {
    const r = cleanLink('https://www.youtube.com/watch?v=abc&list=PL1&index=3&feature=share&si=q&pp=x');
    expect(r.cleaned).toBe('https://www.youtube.com/watch?v=abc&list=PL1&index=3');
    expect(r.removed).toEqual(['feature', 'si', 'pp']);
  });

  it('tiktok และ douyin แบบเต็มตัด query ทั้งหมด', () => {
    expect(cleanLink('https://www.tiktok.com/@u/video/7000?is_from_webapp=1&sender_device=pc').cleaned).toBe(
      'https://www.tiktok.com/@u/video/7000',
    );
    expect(cleanLink('https://www.douyin.com/video/7000?previous_page=app').cleaned).toBe(
      'https://www.douyin.com/video/7000',
    );
  });

  it('ลิงก์สั้น vm.tiktok.com / v.douyin.com คงเดิมพร้อมหมายเหตุ', () => {
    const r = cleanLink('https://vm.tiktok.com/ZSabc/');
    expect(r.cleaned).toBe('https://vm.tiktok.com/ZSabc/');
    expect(r.note).toMatch(/ลิงก์สั้น/);
    expect(cleanLink('https://v.douyin.com/abc/').note).toMatch(/ลิงก์สั้น/);
  });

  it('ไม่ใช่ http/https → ok=false', () => {
    expect(cleanLink('สวัสดี')).toMatchObject({ ok: false, cleaned: 'สวัสดี' });
    expect(cleanLink('ftp://x.y/z')).toMatchObject({ ok: false });
  });
});

describe('cleanLinks', () => {
  it('แยกบรรทัด ข้ามบรรทัดว่าง และจำกัดจำนวน', () => {
    const many = Array.from({ length: MAX_LINES + 5 }, (_, i) => `https://a.b/${i}?utm_source=x`).join('\n');
    expect(cleanLinks(many)).toHaveLength(MAX_LINES);
    expect(cleanLinks('\n\nhttps://a.b/?gclid=1\n\n')).toHaveLength(1);
    expect(cleanLinks('')).toEqual([]);
  });
});
