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

  it('youtube.com/results เก็บคำค้น search_query ไว้', () => {
    const r = cleanLink('https://www.youtube.com/results?search_query=%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7+ไทย&si=x');
    expect(r.cleaned).toBe('https://www.youtube.com/results?search_query=%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7+ไทย');
    expect(r.removed).toEqual(['si']);
  });

  it('youtube.com/embed เก็บ start/end และค่าของ player ไว้ ตัดแค่ตัวติดตาม', () => {
    const r = cleanLink('https://www.youtube.com/embed/abc?start=30&end=60&autoplay=1&si=q');
    expect(r.cleaned).toBe('https://www.youtube.com/embed/abc?start=30&end=60&autoplay=1');
    expect(r.removed).toEqual(['si']);
  });

  it('youtu.be เก็บ list ไว้ด้วย', () =>
    expect(cleanLink('https://youtu.be/abc?list=PL1&si=q').cleaned).toBe(
      'https://www.youtube.com/watch?v=abc&list=PL1',
    ));

  it('ดึงลิงก์ออกจากข้อความแชร์ที่มีข้อความนำหน้า (TikTok / LINE)', () => {
    const r = cleanLink('ดูคลิปนี้สิ https://www.tiktok.com/@u/video/7000?is_from_webapp=1 สนุกมาก');
    expect(r).toMatchObject({ ok: true, cleaned: 'https://www.tiktok.com/@u/video/7000' });
    expect(cleanLink('ลองเปิด https://example.com/p?id=5&fbclid=abc.').cleaned).toBe('https://example.com/p?id=5');
  });

  it('ไม่เข้ารหัสค่าที่เก็บไว้ใหม่ (%20 ไม่กลายเป็น +)', () => {
    expect(cleanLink('https://example.com/s?q=a%20b&x=%E0%B8%81&utm_source=line').cleaned).toBe(
      'https://example.com/s?q=a%20b&x=%E0%B8%81',
    );
  });

  it('ตัดตัวติดตามของ Shopee และ Lazada', () => {
    const shopee = cleanLink('https://shopee.co.th/product/1/2?sp_atk=abc&xptdk=def&uls_trackid=g');
    expect(shopee.cleaned).toBe('https://shopee.co.th/product/1/2');
    const lazada = cleanLink(
      'https://www.lazada.co.th/products/i1.html?spm=a2o4m&clickTrackInfo=x&laz_trackid=y&sku=5',
    );
    expect(lazada.cleaned).toBe('https://www.lazada.co.th/products/i1.html?sku=5');
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
