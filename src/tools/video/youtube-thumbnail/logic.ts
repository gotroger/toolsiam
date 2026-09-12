const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);

/** ขนาดรูปปกที่ YouTube เผยแพร่ — maxresdefault มีเฉพาะคลิป HD (ตอบ 404 เมื่อไม่มี) */
export const THUMBNAIL_SIZES = [
  { key: 'maxresdefault', label: 'ใหญ่สุด 1280×720', width: 1280, height: 720 },
  { key: 'sddefault', label: 'มาตรฐาน 640×480', width: 640, height: 480 },
  { key: 'hqdefault', label: 'กลาง 480×360', width: 480, height: 360 },
  { key: 'mqdefault', label: 'เล็ก 320×180', width: 320, height: 180 },
] as const;
export type ThumbnailKey = (typeof THUMBNAIL_SIZES)[number]['key'];

/** ลิงก์ watch / youtu.be / shorts / embed / live หรือรหัส 11 ตัว → รหัสวิดีโอ, ไม่ตรง → null */
export function parseYoutubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  const candidate =
    host === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? '');
  return ID.test(candidate) ? candidate : null;
}

export function thumbnailUrl(id: string, key: ThumbnailKey) {
  return `https://i.ytimg.com/vi/${id}/${key}.jpg`;
}
