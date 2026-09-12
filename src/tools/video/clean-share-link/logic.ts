export const MAX_LINES = 50;

export interface CleanResult {
  input: string;
  cleaned: string;
  removed: string[];
  ok: boolean;
  note?: string;
}

/** พารามิเตอร์ติดตามที่รู้จัก — ตัดได้ทุกโดเมน (utm_* ตรวจแยกด้วย prefix) */
const TRACKING = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'twclid',
  'ttclid',
  'igshid',
  'igsh',
  'mc_cid',
  'mc_eid',
  'yclid',
  '_ga',
  '_gl',
  'ref_src',
  'ref_url',
  'si',
  'feature',
  'mibextid',
]);
const isTracking = (key: string) => key.toLowerCase().startsWith('utm_') || TRACKING.has(key.toLowerCase());

/** youtube.com: เก็บเฉพาะที่จำเป็นต่อการเปิดคลิปให้ตรงจุด — ที่เหลือคือตัวติดตามหรือค่าประกอบของแอป */
const YOUTUBE_KEEP = new Set(['v', 't', 'list', 'index']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
/** ลิงก์สั้นที่ต้องให้เซิร์ฟเวอร์ของแอป redirect — เบราว์เซอร์แก้จากหน้าเว็บนี้ไม่ได้ (CORS) */
const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'v.douyin.com']);
const SHORT_NOTE = 'ลิงก์สั้นต้องเปิดในแอปก่อนจึงเห็นลิงก์เต็ม เบราว์เซอร์แก้ให้ไม่ได้';

const rebuild = (url: URL) => {
  const query = url.searchParams.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
};

export function cleanLink(raw: string): CleanResult {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { input, cleaned: input, removed: [], ok: false };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { input, cleaned: input, removed: [], ok: false };
  const host = url.hostname.toLowerCase();
  if (SHORT_HOSTS.has(host)) return { input, cleaned: input, removed: [], ok: true, note: SHORT_NOTE };

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    const next = new URL(`https://www.youtube.com/watch?v=${id}`);
    const t = url.searchParams.get('t');
    if (t) next.searchParams.set('t', t);
    const removed = [...new Set(url.searchParams.keys())].filter((key) => key !== 't');
    return { input, cleaned: rebuild(next), removed, ok: true };
  }

  const isYoutube = YOUTUBE_HOSTS.has(host);
  const stripAll = (host.endsWith('tiktok.com') || host.endsWith('douyin.com')) && /\/video\/\d+/.test(url.pathname);
  const removed: string[] = [];
  for (const key of [...new Set(url.searchParams.keys())]) {
    const drop = stripAll || (isYoutube ? !YOUTUBE_KEEP.has(key) : isTracking(key));
    if (drop) {
      url.searchParams.delete(key);
      removed.push(key);
    }
  }
  // ไม่มีอะไรให้ตัด → คืนค่าเดิมทุกตัวอักษร (URL API จะ normalize ตัวพิมพ์และ path ซึ่งผู้ใช้ไม่ได้ขอ)
  return { input, cleaned: removed.length ? rebuild(url) : input, removed, ok: true };
}

export function cleanLinks(text: string): CleanResult[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map(cleanLink);
}
