import { describe, expect, it } from 'vitest';
import { buildJob, DEFAULT_OPTIONS, inputExt, MAX_GIF_SECONDS, outputName, type VideoOptions } from './args';

const opts = (over: Partial<VideoOptions> = {}): VideoOptions => ({ ...DEFAULT_OPTIONS, ...over });

describe('outputName', () => {
  it('ตัดนามสกุล แทนอักขระไม่ปลอดภัย และจำกัดความยาว', () => {
    expect(outputName('คลิป งาน.MP4', '-trim', 'mp4')).toBe('คลิป-งาน-trim.mp4');
    expect(outputName('a/b\\c:d.mov', '', 'mp3')).toBe('a-b-c-d.mp3');
    expect(outputName('x'.repeat(100) + '.mp4', '', 'gif')).toBe('x'.repeat(60) + '.gif');
    expect(outputName('.mp4', '-trim', 'mp4')).toBe('video-trim.mp4');
  });
});

describe('inputExt', () => {
  it('อ่านนามสกุลแบบไม่สนตัวพิมพ์ และตกไป mp4 เมื่อไม่รู้จัก', () => {
    expect(inputExt('A.MOV')).toBe('mov');
    expect(inputExt('a.webm')).toBe('webm');
    expect(inputExt('a.M4V')).toBe('m4v');
    expect(inputExt('noext')).toBe('mp4');
  });
});

describe('buildJob', () => {
  it('trim เร็ว: stream copy เป็น mp4 พร้อม faststart', () => {
    const mp4 = buildJob('video-trim', 'a.mov', opts({ start: 5, end: 12.5 }));
    expect(mp4.args).toEqual([
      '-ss',
      '5',
      '-i',
      'in.mov',
      '-t',
      '7.5',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      'out.mp4',
    ]);
    expect(mp4).toMatchObject({ output: 'a-trim.mp4', mime: 'video/mp4', expectedSeconds: 7.5 });
  });

  it('trim เร็วของ webm เข้ารหัสใหม่เสมอ เพราะ stream copy ตัดไม่ตรง', () => {
    const webm = buildJob('video-trim', 'a.webm', opts({ start: 0, end: 3 }));
    expect(webm.args).toContain('libx264');
    expect(webm).toMatchObject({ output: 'a-trim.mp4', mime: 'video/mp4', expectedSeconds: 3 });
  });

  it('trim แม่นยำ: เข้ารหัสใหม่เป็น H.264/AAC เสมอ', () => {
    const job = buildJob('video-trim', 'a.webm', opts({ start: 1, end: 2, precise: true }));
    expect(job.args).toEqual([
      '-ss',
      '1',
      '-i',
      'in.webm',
      '-t',
      '1',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
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
    ]);
    expect(job.output).toBe('a-trim.mp4');
  });

  it('mp3 ตามบิตเรต และไม่รู้ระยะทั้งคลิป', () => {
    const job = buildJob('video-to-mp3', 'song.mp4', opts({ bitrate: 320 }));
    expect(job.args).toEqual(['-i', 'in.mp4', '-vn', '-c:a', 'libmp3lame', '-b:a', '320k', 'out.mp3']);
    expect(job).toMatchObject({ output: 'song.mp3', mime: 'audio/mpeg', expectedSeconds: null });
  });

  it('gif ใช้ palette สองขั้นใน filter เดียว', () => {
    const job = buildJob('video-to-gif', 'a.mp4', opts({ start: 2, end: 7, gifWidth: 480, gifFps: 15 }));
    expect(job.args).toEqual([
      '-ss',
      '2',
      '-t',
      '5',
      '-i',
      'in.mp4',
      '-filter_complex',
      '[0:v]fps=15,scale=480:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
      '-loop',
      '0',
      'out.gif',
    ]);
    expect(job).toMatchObject({ output: 'a.gif', mime: 'image/gif', expectedSeconds: 5 });
  });

  it('gif เกิน 15 วินาทีโยน error', () => {
    expect(() => buildJob('video-to-gif', 'a.mp4', opts({ start: 0, end: MAX_GIF_SECONDS + 1 }))).toThrow(/15 วินาที/);
  });

  it('compress จำกัดด้านยาวตาม preset โดยไม่ขยาย', () => {
    const job = buildJob('video-compress', 'a.mov', opts({ preset: 720 }));
    expect(job.args).toEqual([
      '-i',
      'in.mov',
      '-vf',
      "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
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
    ]);
    expect(job).toMatchObject({ output: 'a-compressed.mp4', expectedSeconds: null });
    expect(buildJob('video-compress', 'a.mp4', opts({ preset: 480 })).args[3]).toContain('854');
    expect(buildJob('video-compress', 'a.mp4', opts({ preset: 1080 })).args[3]).toContain('1920');
  });

  it('เวลาเริ่มต้องน้อยกว่าเวลาจบ และไม่ติดลบ', () => {
    expect(() => buildJob('video-trim', 'a.mp4', opts({ start: 5, end: 5 }))).toThrow(/เวลาเริ่ม/);
    expect(() => buildJob('video-to-gif', 'a.mp4', opts({ start: -1, end: 3 }))).toThrow(/เวลาเริ่ม/);
  });

  it('เวลาทศนิยมยาวถูกปัดเป็น 3 ตำแหน่ง', () => {
    expect(buildJob('video-trim', 'a.mp4', opts({ start: 1.23456, end: 2.5 })).args[1]).toBe('1.235');
  });
});
