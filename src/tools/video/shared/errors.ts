/**
 * แปล log ของ ffmpeg เป็นข้อความภาษาไทย — แยกจาก ffmpeg.worker.ts เพื่อทดสอบได้
 * ใช้ args ของงานบอกว่าเป็นเครื่องมือไหน: ข้อความ "ไม่มีสตรีม" หมายถึงคนละเรื่องกันในแต่ละงาน
 */
export function translateFfmpegError(log: string, code: number, args: string[]): string {
  if (/Invalid data found|moov atom not found|Unable to find a suitable output/.test(log))
    return 'ไฟล์เสียหายหรือเป็นชนิดที่อ่านไม่ได้ กรุณาลองไฟล์อื่น';
  if (/Output file is empty|does not contain any stream/.test(log)) {
    // -vn = ดึงเสียงอย่างเดียว (video-to-mp3) — ไม่มีสตรีมออก แปลว่าคลิปไม่มีแทร็กเสียง
    if (args.includes('-vn')) return 'วิดีโอนี้ไม่มีเสียง จึงแปลงเป็น MP3 ไม่ได้';
    // -ss = งานที่เลือกช่วงเวลา (ตัดคลิป/GIF) — ผลว่างมักเพราะช่วงอยู่นอกความยาวคลิป
    if (args.includes('-ss')) return 'ช่วงเวลาที่เลือกอยู่นอกความยาวคลิป กรุณาตรวจเวลาเริ่มและจบ';
    return 'ไม่พบภาพหรือเสียงที่แปลงได้ในไฟล์นี้ กรุณาลองไฟล์อื่น';
  }
  if (/Cannot allocate memory|out of memory|Aborted/i.test(log))
    return 'หน่วยความจำไม่พอ กรุณาใช้ไฟล์ที่เล็กลงหรือเลือกช่วงที่สั้นลง';
  return `แปลงไม่สำเร็จ (รหัส ${code}) กรุณาลองไฟล์อื่นหรือลดขนาดไฟล์`;
}
