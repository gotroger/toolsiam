import { dimensions } from './logic';
import type { Job, Output } from './types';

export async function readBitmap(file: File) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('เปิดรูปไม่สำเร็จ กรุณาเลือก JPG PNG หรือ WebP ที่ไม่เสียหาย');
  }
  try {
    dimensions(bitmap.width, bitmap.height);
  } catch (error) {
    bitmap.close();
    throw error;
  }
  return bitmap;
}
function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== type)
          reject(new Error('เบราว์เซอร์นี้ไม่รองรับชนิดไฟล์ปลายทาง กรุณาเลือก PNG หรือ JPG'));
        else resolve(blob);
      },
      type,
      quality,
    ),
  );
}
export async function processImage({ id, files, options }: Job, signal: AbortSignal): Promise<Output> {
  if (id === 'images-to-pdf') {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    for (const file of files) {
      signal.throwIfAborted();
      const bitmap = await readBitmap(file);
      const canvas = document.createElement('canvas');
      try {
        const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการแปลงภาพ');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await canvasBlob(canvas, 'image/jpeg', 0.9);
        signal.throwIfAborted();
        const image = await pdf.embedJpg(await blob.arrayBuffer());
        const page = pdf.addPage([595.28, 841.89]);
        const ratio = Math.min(547.28 / image.width, 793.89 / image.height);
        const width = image.width * ratio,
          height = image.height * ratio;
        page.drawImage(image, { x: (595.28 - width) / 2, y: (841.89 - height) / 2, width, height });
      } finally {
        bitmap.close();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    signal.throwIfAborted();
    return {
      blob: new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' }),
      name: 'images.pdf',
      summary: `PDF ขนาด A4 · ${files.length} หน้า`,
    };
  }
  const bitmap = await readBitmap(files[0]);
  const canvas = document.createElement('canvas');
  try {
    signal.throwIfAborted();
    const { width, height } = dimensions(
      bitmap.width,
      bitmap.height,
      id === 'image-resize' ? options.width : undefined,
    );
    const angle = id === 'image-rotate' ? options.angle : 0;
    const quarter = angle === 90 || angle === 270;
    canvas.width = quarter ? height : width;
    canvas.height = quarter ? width : height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการแปลงภาพ');
    if (options.format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    if (id === 'image-rotate' && options.flip) ctx.scale(-1, 1);
    ctx.drawImage(bitmap, -width / 2, -height / 2, width, height);
    const blob = await canvasBlob(canvas, options.format, options.quality / 100);
    signal.throwIfAborted();
    const ext = options.format === 'image/jpeg' ? 'jpg' : options.format.split('/')[1];
    const sizeChange = Math.round((1 - blob.size / files[0].size) * 100);
    return {
      blob,
      name: `${files[0].name.replace(/\.[^.]+$/, '')}-${id}.${ext}`,
      summary: `${canvas.width} × ${canvas.height} พิกเซล · ${sizeChange >= 0 ? `ไฟล์เล็กลง ${sizeChange}%` : `ไฟล์ใหญ่ขึ้น ${-sizeChange}%`}`,
    };
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
  }
}
