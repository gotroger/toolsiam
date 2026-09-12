import type { ToolMeta } from '../types';
import type { VideoToolId } from './shared/args';

export const FFMPEG_CREDIT = 'ประมวลผลด้วย FFmpeg ผ่าน ffmpeg.wasm (GPL) ในเบราว์เซอร์ของคุณ';
export const FFMPEG_SOURCE = 'https://github.com/ffmpegwasm/ffmpeg.wasm';

/**
 * เครื่องมือวิดีโอที่ใช้ engine — UI ร่วมกันคือ shared/VideoTool.tsx keyed ด้วย id
 * `slow` = เข้ารหัสใหม่ทั้งคลิป ต้องเตือนเรื่องเวลาบนมือถือ
 */
export const videoTools: Record<
  VideoToolId,
  {
    name: string;
    nameEn: string;
    action: string;
    description: string;
    detail: string;
    keywords: string[];
    slow: boolean;
  }
> = {
  'video-trim': {
    name: 'ตัดคลิปวิดีโอ',
    nameEn: 'Trim Video',
    action: 'ตัดคลิป',
    description:
      'ตัดช่วงวิดีโอตามเวลาเริ่มและจบ โหมดเร็วไม่เข้ารหัสใหม่ หรือโหมดแม่นยำถึงวินาที ประมวลผลบนอุปกรณ์ ไม่อัปโหลดไฟล์',
    detail:
      'โหมดเร็วคง codec เดิมและเริ่มเล่นที่จุดตัดจริง (ไฟล์ WebM ใช้โหมดแม่นยำเสมอ) โหมดแม่นยำเข้ารหัสใหม่เป็น MP4 ใช้เวลาใกล้เคียงความยาวช่วงที่เลือก',
    keywords: ['ตัดคลิป', 'ตัดวิดีโอ', 'trim video', 'ตัดต่อวิดีโอออนไลน์'],
    slow: false,
  },
  'video-to-mp3': {
    name: 'แปลงวิดีโอเป็น MP3',
    nameEn: 'Video to MP3',
    action: 'แปลงเป็น MP3',
    description:
      'ดึงเสียงจากไฟล์วิดีโอ MP4 MOV WebM เป็น MP3 เลือกบิตเรต 128 192 หรือ 320 kbps ทำในเบราว์เซอร์โดยไม่อัปโหลดไฟล์',
    detail:
      'รับไฟล์วิดีโอไม่เกิน 100 MB เข้ารหัสเสียงใหม่ทั้งคลิปด้วย libmp3lame คลิปยาว 10 นาทีใช้เวลาราวหนึ่งนาทีบนคอมพิวเตอร์ทั่วไป',
    keywords: ['แปลงวิดีโอเป็น mp3', 'ดึงเสียงจากวิดีโอ', 'mp4 to mp3', 'แยกเสียง'],
    slow: false,
  },
  'video-to-gif': {
    name: 'แปลงวิดีโอเป็น GIF',
    nameEn: 'Video to GIF',
    action: 'สร้าง GIF',
    description:
      'ทำ GIF จากช่วงสั้น ๆ ของวิดีโอไม่เกิน 15 วินาที เลือกความกว้างและเฟรมเรต ใช้พาเลตสีอัตโนมัติให้ภาพคม ทำในเบราว์เซอร์',
    detail:
      'เลือกช่วงไม่เกิน 15 วินาที ความกว้าง 240 320 หรือ 480 พิกเซล ที่ 10 หรือ 15 เฟรมต่อวินาที ไฟล์ GIF ใหญ่ขึ้นตามความกว้าง เฟรมเรต และความยาว',
    keywords: ['วิดีโอเป็น gif', 'ทำ gif', 'mp4 to gif', 'สร้างภาพเคลื่อนไหว'],
    slow: false,
  },
  'video-compress': {
    name: 'ลดขนาดไฟล์วิดีโอ',
    nameEn: 'Compress Video',
    action: 'ลดขนาดวิดีโอ',
    description:
      'ย่อไฟล์วิดีโอให้เล็กลงด้วยการเข้ารหัส H.264 ใหม่ที่ 480p 720p หรือ 1080p ส่งแชตหรืออัปโหลดง่ายขึ้น ทำในเบราว์เซอร์โดยไม่อัปโหลดไฟล์',
    detail:
      'เข้ารหัสใหม่ทั้งคลิป ใช้เวลาใกล้เคียงหรือมากกว่าความยาวคลิปบนมือถือ คลิปที่เล็กกว่า preset จะไม่ถูกขยาย ผลลัพธ์เป็น MP4 พร้อมเสียง AAC 96 kbps',
    keywords: ['ลดขนาดวิดีโอ', 'บีบอัดวิดีโอ', 'compress video', 'ย่อไฟล์วิดีโอ'],
    slow: true,
  },
};

const ENGINE_IDS = Object.keys(videoTools) as VideoToolId[];

export const videoToolMetas: ToolMeta[] = ENGINE_IDS.map((slug) => {
  const tool = videoTools[slug];
  return {
    slug,
    name: tool.name,
    nameEn: tool.nameEn,
    category: 'video',
    description: tool.description,
    keywords: tool.keywords,
    contentUpdatedAt: '2026-09-13',
    howTo: [
      'เลือกไฟล์วิดีโอ MP4 MOV M4V หรือ WebM ไม่เกิน 100 MB',
      tool.detail,
      `กด “${tool.action}” รอแถบความคืบหน้า แล้วกดดาวน์โหลด`,
    ],
    faq: [
      {
        q: 'ไฟล์ถูกส่งขึ้นเซิร์ฟเวอร์หรือไม่?',
        a: 'ไม่ วิดีโอถูกประมวลผลในเบราว์เซอร์ของคุณด้วย FFmpeg เวอร์ชัน WebAssembly ไม่มีการอัปโหลดหรือเก็บไฟล์ ครั้งแรกจะโหลดตัวประมวลผลราว 10 MB แล้วเบราว์เซอร์จะจำไว้',
      },
      { q: 'เครื่องมือนี้มีข้อจำกัดอะไรบ้าง?', a: tool.detail },
      {
        q: 'ดาวน์โหลดวิดีโอจาก YouTube หรือ TikTok ได้ไหม?',
        a: 'ไม่ได้ เครื่องมือรับเฉพาะไฟล์ที่อยู่ในอุปกรณ์ของคุณ ไม่ดึงวิดีโอจากเว็บไซต์หรือแอปใด',
      },
    ],
    disclaimer: 'ใช้กับไฟล์ที่คุณมีสิทธิ์ใช้งาน เครื่องมือนี้ไม่ดาวน์โหลดวิดีโอจากเว็บไซต์หรือแอปใด',
    related: ENGINE_IDS.filter((s) => s !== slug),
  };
});
