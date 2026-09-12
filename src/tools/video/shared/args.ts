export type VideoToolId = 'video-trim' | 'video-to-mp3' | 'video-to-gif' | 'video-compress';
export type InputExt = 'mp4' | 'mov' | 'm4v' | 'webm';

export interface VideoOptions {
  start: number;
  end: number;
  /** trim: เข้ารหัสใหม่ให้ตัดตรงวินาที (ช้ากว่า stream copy มาก) */
  precise: boolean;
  bitrate: 128 | 192 | 320;
  gifWidth: 240 | 320 | 480;
  gifFps: 10 | 15;
  /** compress: จำกัดด้านยาวของภาพ (480p → 854, 720p → 1280, 1080p → 1920) */
  preset: 480 | 720 | 1080;
}
export const DEFAULT_OPTIONS: VideoOptions = {
  start: 0,
  end: 0,
  precise: false,
  bitrate: 192,
  gifWidth: 320,
  gifFps: 10,
  preset: 720,
};
export const MAX_GIF_SECONDS = 15;
export const MAX_INPUT_MB = 100;
export const ACCEPT = '.mp4,.mov,.m4v,.webm';

export interface VideoJobSpec {
  args: string[];
  /** ชื่อไฟล์ที่ผู้ใช้จะได้ */
  output: string;
  mime: string;
  /** ระยะเวลาผลลัพธ์ที่คาด (วินาที) สำหรับคิดเปอร์เซ็นต์ · null = ทั้งคลิป (caller เติมจาก <video>) */
  expectedSeconds: number | null;
}

const LONG_SIDE: Record<VideoOptions['preset'], number> = { 480: 854, 720: 1280, 1080: 1920 };
const H264 = ['-c:v', 'libx264', '-preset', 'veryfast'];
/** yuv420p เพื่อให้ MP4 เปิดได้บน iPhone/LINE — บางแอปส่งคลิป 4:4:4 มา */
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export function inputExt(fileName: string): InputExt {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext === 'mov' || ext === 'm4v' || ext === 'webm' ? ext : 'mp4';
}

export function outputName(fileName: string, suffix: string, ext: string): string {
  const base = fileName
    .replace(/\.[^.]*$/, '')
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'video'}${suffix}.${ext}`;
}

function range(options: VideoOptions) {
  if (options.start < 0 || options.end <= options.start) throw new Error('เวลาเริ่มต้องน้อยกว่าเวลาจบ และไม่ติดลบ');
  return options.end - options.start;
}

export function buildJob(id: VideoToolId, fileName: string, options: VideoOptions): VideoJobSpec {
  const ext = inputExt(fileName);
  const input = `in.${ext}`;
  switch (id) {
    case 'video-trim': {
      const duration = range(options);
      // webm ไม่มี edit list — stream copy ตัดได้แค่ที่คีย์เฟรมและความยาวเพี้ยน (QA: ขอ 4 วิ ได้ 6 วิ) จึงเข้ารหัสใหม่เสมอ
      if (options.precise || ext === 'webm') {
        return {
          args: [
            '-ss',
            fmt(options.start),
            '-i',
            input,
            '-t',
            fmt(duration),
            ...H264,
            '-crf',
            '23',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-movflags',
            '+faststart',
            'out.mp4',
          ],
          output: outputName(fileName, '-trim', 'mp4'),
          mime: 'video/mp4',
          expectedSeconds: duration,
        };
      }
      // stream copy ของ mp4/mov/m4v: muxer เขียน edit list ให้เริ่มเล่นที่จุดตัดจริงแม้เฟรมเริ่มที่คีย์เฟรมก่อนหน้า
      // ไม่ใส่ -avoid_negative_ts make_zero: มันเลื่อนเฟรมก่อนจุดเริ่ม (ตั้งแต่คีย์เฟรม) มาเป็นเวลา 0 ทำให้คลิปยาวเกิน
      // ปล่อยให้ muxer เขียน edit list แทน → ผู้เล่นเริ่มที่จุดตัดจริงและได้ความยาวตรง (ทดสอบ ffmpeg 7.1: 7.00 วิ)
      return {
        args: [
          '-ss',
          fmt(options.start),
          '-i',
          input,
          '-t',
          fmt(duration),
          '-c',
          'copy',
          '-movflags',
          '+faststart',
          'out.mp4',
        ],
        output: outputName(fileName, '-trim', 'mp4'),
        mime: 'video/mp4',
        expectedSeconds: duration,
      };
    }
    case 'video-to-mp3':
      return {
        args: ['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', `${options.bitrate}k`, 'out.mp3'],
        output: outputName(fileName, '', 'mp3'),
        mime: 'audio/mpeg',
        expectedSeconds: null,
      };
    case 'video-to-gif': {
      const duration = range(options);
      if (duration > MAX_GIF_SECONDS)
        throw new Error(`GIF ทำได้ไม่เกิน ${MAX_GIF_SECONDS} วินาที กรุณาเลือกช่วงที่สั้นลง`);
      // palettegen/paletteuse ในคำสั่งเดียว — สีคมกว่า GIF ค่าเริ่มต้นของ ffmpeg มาก
      const filter = `[0:v]fps=${options.gifFps},scale=${options.gifWidth}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
      return {
        args: [
          '-ss',
          fmt(options.start),
          '-t',
          fmt(duration),
          '-i',
          input,
          '-filter_complex',
          filter,
          '-loop',
          '0',
          'out.gif',
        ],
        output: outputName(fileName, '', 'gif'),
        mime: 'image/gif',
        expectedSeconds: duration,
      };
    }
    case 'video-compress': {
      const side = LONG_SIDE[options.preset];
      // จำกัดด้านยาว (แนวตั้ง/แนวนอน) โดยไม่ขยายคลิปที่เล็กกว่า preset · -2 คงสัดส่วนและหารสองลงตัว
      const scale = `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))'`;
      return {
        args: [
          '-i',
          input,
          '-vf',
          scale,
          ...H264,
          '-crf',
          '28',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '96k',
          '-movflags',
          '+faststart',
          'out.mp4',
        ],
        output: outputName(fileName, '-compressed', 'mp4'),
        mime: 'video/mp4',
        expectedSeconds: null,
      };
    }
  }
}
