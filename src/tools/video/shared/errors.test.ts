import { describe, expect, it } from 'vitest';
import { buildJob, DEFAULT_OPTIONS } from './args';
import { translateFfmpegError } from './errors';

const mp3 = buildJob('video-to-mp3', 'a.mp4', DEFAULT_OPTIONS).args;
const trim = buildJob('video-trim', 'a.mp4', { ...DEFAULT_OPTIONS, start: 50, end: 60 }).args;
const compress = buildJob('video-compress', 'a.mp4', DEFAULT_OPTIONS).args;

describe('translateFfmpegError', () => {
  it('ดึงเสียงจากวิดีโอที่ไม่มีแทร็กเสียง → บอกว่าไม่มีเสียง ไม่ใช่เรื่องช่วงเวลา', () => {
    const message = translateFfmpegError('Output file #0 does not contain any stream', 1, mp3);
    expect(message).toContain('ไม่มีเสียง');
    expect(message).not.toContain('ช่วงเวลา');
  });
  it('ตัดช่วงที่อยู่นอกคลิป → บอกเรื่องช่วงเวลา', () => {
    expect(translateFfmpegError('Output file is empty, nothing was encoded', 1, trim)).toContain('ช่วงเวลา');
  });
  it('งานที่ไม่ได้เลือกช่วงเวลา → ไม่พูดถึงช่วงเวลา', () => {
    expect(translateFfmpegError('Output file does not contain any stream', 1, compress)).not.toContain('ช่วงเวลา');
  });
  it('ไฟล์เสียหาย / หน่วยความจำหมด / อื่น ๆ', () => {
    expect(translateFfmpegError('moov atom not found', 1, mp3)).toContain('ไฟล์เสียหาย');
    expect(translateFfmpegError('Aborted()', 1, compress)).toContain('หน่วยความจำไม่พอ');
    expect(translateFfmpegError('', 7, compress)).toContain('รหัส 7');
  });
});
