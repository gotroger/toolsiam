import { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { classifyQrText, type QrParsed } from './logic';
import { CopyButton, ErrorText } from '@/components/ui';

/** ขนาดไฟล์สูงสุดที่ยอมให้ถอดรหัส (กันเบราว์เซอร์มือถือค้าง) */
const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** ด้านที่ยาวที่สุดของภาพที่ส่งเข้า jsQR ในรอบแรก */
const MAX_DIMENSION = 1600;
/** รอบสองอ่านละเอียดขึ้นแต่ยังจำกัดขนาด ไม่ปล่อยตามความละเอียดจริงของรูป */
const RETRY_DIMENSION = 4000;

/** วาดลง canvas ตามอัตราส่วนที่กำหนด แล้วให้ jsQR อ่าน */
function scanBitmap(bitmap: ImageBitmap, scale: number): string | null {
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return jsQR(image.data, image.width, image.height)?.data ?? null;
}

async function decodeFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_DIMENSION / longestSide);
    const first = scanBitmap(bitmap, scale);
    if (first !== null || scale === 1) return first;
    // ย่อแล้วอ่านไม่ออก ลองอีกครั้งที่ความละเอียดสูงขึ้น (QR เม็ดเล็กในรูปใหญ่)
    const retryScale = Math.min(1, RETRY_DIMENSION / longestSide);
    return retryScale > scale ? scanBitmap(bitmap, retryScale) : null;
  } finally {
    bitmap.close();
  }
}

export default function QrReaderTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [parsed, setParsed] = useState<QrParsed | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(
        `ไฟล์ใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(1)} MB) รองรับไม่เกิน ${MAX_FILE_BYTES / 1024 / 1024} MB กรุณาย่อรูปหรือครอบตัดเฉพาะส่วนที่มี QR`,
      );
      return;
    }
    const myRequestId = ++requestId.current;
    setBusy(true);
    setError('');
    setParsed(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    try {
      const text = await decodeFile(file);
      if (myRequestId !== requestId.current) return;
      if (text === null) setError('อ่าน QR จากรูปนี้ไม่สำเร็จ ลองใช้รูปที่ชัดขึ้นหรือครอบตัดให้เห็น QR เต็ม ๆ');
      else setParsed(classifyQrText(text));
    } catch {
      if (myRequestId !== requestId.current) return;
      setError('เปิดไฟล์รูปไม่สำเร็จ กรุณาลองไฟล์อื่น');
    } finally {
      if (myRequestId === requestId.current) setBusy(false);
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
        <svg className="h-7 w-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm0 10 4.5-4.5 5 5m2-2 2.5-2.5L20 16M15 8.5v.2" />
        </svg>
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
      {error && <ErrorText>{error}</ErrorText>}

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
            <CopyButton text={parsed.raw} label="คัดลอกข้อความดิบ" />
            {parsed.kind === 'url' && (
              <a
                href={parsed.fields[0].value}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-lg border border-slate-300 bg-surface px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
