export const MAX_FILES = 10;
export const MAX_MB = 10;
/** รูปจากกล้องมือถือ 12–48 MP ทำให้อ่านช้าและแรมเต็มโดยไม่ได้แม่นขึ้น — ย่อด้านยาวลงก่อนส่งเข้า engine */
export const MAX_SIDE = 2400;
export const ACCEPT = '.jpg,.jpeg,.png,.webp';

const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION = /\.(jpe?g|png|webp)$/i;

/** คืนข้อความ error ภาษาไทย หรือ '' เมื่อผ่าน */
export function validateFiles(files: File[]): string {
  if (!files.length) return 'กรุณาเลือกรูปอย่างน้อย 1 รูป';
  if (files.length > MAX_FILES) return `เลือกได้ไม่เกิน ${MAX_FILES} รูปต่อครั้ง (เลือกมา ${files.length} รูป)`;
  for (const file of files) {
    if (!TYPES.has(file.type) || !EXTENSION.test(file.name))
      return `“${file.name}” ไม่ใช่รูปที่รองรับ กรุณาเลือก JPG PNG หรือ WebP`;
    if (file.size > MAX_MB * 1048576) return `“${file.name}” ใหญ่เกิน ${MAX_MB} MB`;
  }
  return '';
}

export function targetSize(width: number, height: number): { width: number; height: number; scaled: boolean } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  if (scale === 1) return { width, height, scaled: false };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

/** รูปที่ไม่ต้องย่อส่ง Blob เดิมเข้า engine (ไม่เข้ารหัสซ้ำ) · ผู้เรียกต้องล้าง canvas เองหลังใช้ (width = 0) */
export async function prepareImage(file: File): Promise<Blob | HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('เปิดรูปไม่สำเร็จ ไฟล์อาจเสียหาย');
  }
  try {
    const size = targetSize(bitmap.width, bitmap.height);
    if (!size.scaled) return file;
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการย่อรูป');
    // PNG/WebP โปร่งใสวาดลงพื้นขาว — พื้นดำทำให้ตัวหนังสือสีเข้มอ่านไม่ออก
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
