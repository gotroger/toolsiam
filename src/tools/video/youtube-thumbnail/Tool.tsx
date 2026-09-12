import { useRef, useState } from 'react';
import { parseYoutubeId, THUMBNAIL_SIZES, thumbnailUrl, type ThumbnailKey } from './logic';
import { Button, ErrorText, Field, Input } from '@/components/ui';

export default function YoutubeThumbnailTool() {
  const [input, setInput] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<ThumbnailKey[]>([]);
  const [busy, setBusy] = useState<ThumbnailKey | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  function hide(key: ThumbnailKey) {
    setMissing((m) => (m.includes(key) ? m : [...m, key]));
  }
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function search() {
    const parsed = parseYoutubeId(input);
    setMissing([]);
    if (!parsed) {
      setId(null);
      fail('ไม่พบรหัสวิดีโอ กรุณาวางลิงก์ YouTube, Shorts หรือรหัส 11 ตัว');
      return;
    }
    setError('');
    setId(parsed);
  }

  async function download(key: ThumbnailKey) {
    if (!id) return;
    const url = thumbnailUrl(id, key);
    setBusy(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${id}-${key}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      // เบราว์เซอร์ที่บล็อก fetch ข้ามโดเมน → เปิดรูปให้บันทึกเอง
      window.open(url, '_blank', 'noopener');
      fail('เบราว์เซอร์นี้บันทึกตรงไม่ได้ เปิดรูปในแท็บใหม่แล้วกดค้างหรือคลิกขวาเพื่อบันทึก');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Field label="ลิงก์หรือรหัสวิดีโอ YouTube" htmlFor="yt">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="yt"
            value={input}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? 'yt-errors' : undefined}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') search();
            }}
          />
          <Button type="button" className="shrink-0" onClick={search}>
            ค้นหารูปปก
          </Button>
        </div>
      </Field>
      <div id="yt-errors" ref={errorRef} tabIndex={-1}>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      {id && (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="รูปปกที่พบ">
          {THUMBNAIL_SIZES.filter((s) => !missing.includes(s.key)).map((size) => (
            <li key={size.key} className="rounded-xl border border-slate-200 bg-surface p-3">
              <img
                src={thumbnailUrl(id, size.key)}
                alt={`รูปปกขนาด ${size.width}×${size.height}`}
                width={size.width}
                height={size.height}
                className="h-auto w-full rounded-lg bg-slate-100"
                loading="lazy"
                // ขนาดที่ไม่มีจริง YouTube ตอบ 404 หรือส่งรูปแทน 120×90 กลับมาแทน (พบทั้งสองแบบตอน QA) — ซ่อนทั้งคู่
                onLoad={(e) => {
                  if (e.currentTarget.naturalWidth < size.width / 2) hide(size.key);
                }}
                onError={() => hide(size.key)}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{size.label}</span>
                <Button type="button" variant="secondary" disabled={busy !== null} onClick={() => download(size.key)}>
                  {busy === size.key ? 'กำลังโหลด…' : 'ดาวน์โหลด'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
