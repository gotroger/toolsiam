/**
 * ลงทะเบียน matcher ของ jest-dom (toBeInTheDocument, toHaveAttribute ฯลฯ)
 *
 * ไฟล์นี้ถูกโหลดกับเทสต์ทุกไฟล์รวมทั้งที่รันบน node — jest-dom ไม่แตะ DOM
 * ตอน import จึงปลอดภัย ส่วน matcher ที่ต้องใช้ DOM จะถูกเรียกเฉพาะในเทสต์ jsdom
 */
import '@testing-library/jest-dom/vitest';
