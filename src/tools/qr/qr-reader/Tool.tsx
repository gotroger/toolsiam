import { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { classifyQrText, type QrParsed } from './logic';
import { Button } from '@/components/ui';

async function decodeFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  bitmap.close();
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}

export default function QrReaderTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [parsed, setParsed] = useState<QrParsed | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    setBusy(true);
    setError('');
    setParsed(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    try {
      const text = await decodeFile(file);
      if (text === null) setError('อ่าน QR จากรูปนี้ไม่สำเร็จ ลองใช้รูปที่ชัดขึ้นหรือครอบตัดให้เห็น QR เต็ม ๆ');
      else setParsed(classifyQrText(text));
    } catch {
      setError('เปิดไฟล์รูปไม่สำเร็จ กรุณาลองไฟล์อื่น');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-brand-600"
      >
        <span className="text-2xl">🖼️</span>
        <span>ลากรูปที่มี QR มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>

      {busy && <p className="text-sm text-slate-500">กำลังอ่าน QR…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <img src={preview} alt="รูปที่อัปโหลด" className="mx-auto max-h-64 rounded-lg border border-slate-200" />
      )}

      {parsed && (
        <div className="space-y-3 rounded-lg border border-brand-600/20 bg-brand-50 p-4">
          <div className="text-xs font-medium text-brand-700">ตรวจพบ: {parsed.label}</div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {parsed.fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="break-all text-sm font-medium">{f.value || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(parsed.raw)}>
              คัดลอกข้อความดิบ
            </Button>
            {parsed.kind === 'url' && (
              <a
                href={parsed.fields[0].value}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                เปิดลิงก์ในแท็บใหม่
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500">
            ตรวจชื่อโดเมนให้แน่ใจก่อนเปิดลิงก์ทุกครั้ง QR ปลอมมักใช้โดเมนที่สะกดใกล้เคียงของจริง
          </p>
        </div>
      )}
    </div>
  );
}
