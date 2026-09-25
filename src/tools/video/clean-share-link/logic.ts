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

/**
 * ตัวติดตามเฉพาะร้านค้าออนไลน์ — ตัดเฉพาะบนโดเมนนั้น (ชื่อสั้นอย่าง spm อาจมีความหมายจริงบนเว็บอื่น)
 * Shopee: sp_atk/xptdk/uls_trackid มาจากปุ่มแชร์ · Lazada: spm/scm/clickTrackInfo/laz_trackid ฯลฯ ของระบบวัดผล Alibaba
 */
const SHOP_TRACKING: [RegExp, Set<string>][] = [
  [/(^|\.)shopee\./, new Set(['sp_atk', 'xptdk', 'uls_trackid'])],
  [/(^|\.)lazada\./, new Set(['spm', 'scm', 'clicktrackinfo', 'laz_trackid', 'abbucket', 'abtest', 'pvid'])],
];

/** youtube.com: เก็บเฉพาะที่จำเป็นต่อการเปิดคลิปให้ตรงจุด — ที่เหลือคือตัวติดตามหรือค่าประกอบของแอป */
const YOUTUBE_KEEP = new Set(['v', 't', 'list', 'index']);
/** หน้าค้นหา — คำค้นและตัวกรองคือเนื้อหาของลิงก์ */
const YOUTUBE_RESULTS_KEEP = new Set(['search_query', 'sp']);
/** youtu.be/ID → watch?v=ID — เก็บเวลาและเพลย์ลิสต์ */
const YOUTU_BE_KEEP = new Set(['t', 'list', 'index']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
/** ลิงก์สั้นที่ต้องให้เซิร์ฟเวอร์ของแอป redirect — เบราว์เซอร์แก้จากหน้าเว็บนี้ไม่ได้ (CORS) */
const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'v.douyin.com']);
const SHORT_NOTE = 'ลิงก์สั้นต้องเปิดในแอปก่อนจึงเห็นลิงก์เต็ม เบราว์เซอร์แก้ให้ไม่ได้';

/** ลิงก์ในข้อความแชร์ เช่น "ดูคลิปนี้ใน TikTok https://…" หรือข้อความจาก LINE */
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;

/** ดึงลิงก์แรกจากข้อความ แล้วตัดเครื่องหมายวรรคตอนท้ายประโยคที่ติดมา */
function extractUrl(text: string): string {
  const match = text.match(URL_IN_TEXT);
  if (!match) return text;
  let url = match[0].replace(/[.,!?;:'"]+$/, '');
  // วงเล็บปิดท้ายที่ไม่มีวงเล็บเปิดคู่ในลิงก์ = วงเล็บของประโยค
  while (url.endsWith(')') && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0))
    url = url.slice(0, -1).replace(/[.,!?;:'"]+$/, '');
  return url;
}

/** แยก query จากข้อความลิงก์ดิบ — ไม่ผ่าน URLSearchParams เพื่อไม่เข้ารหัสค่าที่เก็บไว้ใหม่ (%20 → +, ไทย → %E0…) */
function splitRaw(text: string) {
  const hashAt = text.indexOf('#');
  const body = hashAt < 0 ? text : text.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : text.slice(hashAt);
  const q = body.indexOf('?');
  return { base: q < 0 ? body : body.slice(0, q), query: q < 0 ? '' : body.slice(q + 1), hash };
}

function decodeKey(piece: string) {
  const key = piece.split('=')[0];
  try {
    return decodeURIComponent(key.replace(/\+/g, ' '));
  } catch {
    return key;
  }
}

/** กรองพารามิเตอร์ทีละชิ้นโดยคงข้อความดิบของชิ้นที่เก็บไว้ */
function filterQuery(query: string, drop: (key: string) => boolean) {
  const kept: string[] = [];
  const removed: string[] = [];
  for (const piece of query.split('&')) {
    if (!piece) continue;
    const key = decodeKey(piece);
    if (!drop(key)) kept.push(piece);
    else if (!removed.includes(key)) removed.push(key);
  }
  return { query: kept.join('&'), removed };
}

export function cleanLink(raw: string): CleanResult {
  const input = raw.trim();
  const candidate = extractUrl(input);
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { input, cleaned: input, removed: [], ok: false };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { input, cleaned: input, removed: [], ok: false };
  const host = url.hostname.toLowerCase();
  if (SHORT_HOSTS.has(host)) return { input, cleaned: candidate, removed: [], ok: true, note: SHORT_NOTE };
  const parts = splitRaw(candidate);

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    const { query, removed } = filterQuery(parts.query, (key) => !YOUTU_BE_KEEP.has(key));
    return {
      input,
      cleaned: `https://www.youtube.com/watch?v=${id}${query ? `&${query}` : ''}`,
      removed,
      ok: true,
    };
  }

  const shop = SHOP_TRACKING.find(([pattern]) => pattern.test(host))?.[1];
  const stripAll = (host.endsWith('tiktok.com') || host.endsWith('douyin.com')) && /\/video\/\d+/.test(url.pathname);
  let drop: (key: string) => boolean;
  if (stripAll) drop = () => true;
  else if (YOUTUBE_HOSTS.has(host)) {
    // embed มีค่าของ player (start/end/autoplay/…) ที่ต้องเก็บ — ตัดแค่ตัวติดตามทั่วไป
    if (url.pathname.startsWith('/embed/')) drop = isTracking;
    else {
      const keep = url.pathname === '/results' ? YOUTUBE_RESULTS_KEEP : YOUTUBE_KEEP;
      drop = (key) => !keep.has(key);
    }
  } else drop = (key) => isTracking(key) || !!shop?.has(key.toLowerCase());
  const { query, removed } = filterQuery(parts.query, drop);
  // ไม่มีอะไรให้ตัด → คืนลิงก์เดิมทุกตัวอักษร (URL API จะ normalize ตัวพิมพ์และ path ซึ่งผู้ใช้ไม่ได้ขอ)
  return {
    input,
    cleaned: removed.length ? `${parts.base}${query ? `?${query}` : ''}${parts.hash}` : candidate,
    removed,
    ok: true,
  };
}

export function cleanLinks(text: string): CleanResult[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map(cleanLink);
}
