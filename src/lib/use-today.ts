import { useState, useSyncExternalStore } from 'react';
import { todayInBangkok } from '@/lib/today';

/**
 * "วันนี้" ตามเวลาไทย สำหรับ island ที่ต้อง render ทั้งฝั่ง server และ client
 *
 * ปัญหาที่แก้: หน้าเว็บถูก render ตอน build บนเครื่องที่ไม่ได้อยู่โซนเวลาไทย ถ้าอ่านวันที่
 * ตอน render ตรง ๆ HTML ที่ build ไว้กับตอน hydrate จะได้คนละวัน — React จะบ่นเรื่อง
 * hydration mismatch และผู้ใช้จะเห็นวันเก่าวาบหนึ่งก่อนถูกแทนที่
 *
 * เดิมแก้ด้วย `useEffect(() => setToday(todayInBangkok()), [])` ซึ่งได้ผลถูก แต่เป็นการ
 * setState ตอน effect ทำให้ render สองรอบทุกครั้ง — `useSyncExternalStore` คือเครื่องมือ
 * ที่ React เตรียมไว้สำหรับกรณีนี้โดยตรง: บอกค่าฝั่ง server แยกจากฝั่ง client ได้เลย
 *
 * `subscribe` คืนฟังก์ชันเปล่าเพราะค่าไม่เปลี่ยนระหว่างที่หน้าเปิดอยู่ — ถ้าวันข้ามคืน
 * ระหว่างที่ผู้ใช้เปิดหน้าค้างไว้ ตัวเลขจะยังเป็นวันเดิมจนกว่าจะโหลดหน้าใหม่ ซึ่งตรงกับ
 * พฤติกรรมเดิมและตรงกับสิ่งที่ผู้ใช้คาดหวังจากหน้าที่เปิดค้างไว้
 */
const subscribe = () => () => {};

/** ฝั่ง server ยังไม่รู้ว่าวันนี้คือวันไหนในสายตาผู้ใช้ จึงคืนค่าว่างให้หน้ารอไปก่อน */
const serverSnapshot = () => '';

export function useTodayInBangkok(): string {
  return useSyncExternalStore(subscribe, todayInBangkok, serverSnapshot);
}

/**
 * ช่องวันที่ที่ตั้งต้นเป็น "วันนี้ตามเวลาไทย" แต่ผู้ใช้แก้เองได้
 *
 * เก็บเฉพาะค่าที่ผู้ใช้พิมพ์ (null = ยังไม่เคยแก้) แล้ว fallback ไปวันนี้
 * จึงไม่ต้อง seed state ด้วย effect และไม่มี render รอบที่สองให้เสียเปล่า
 */
export function useDateInput(): [string, (value: string) => void] {
  const today = useTodayInBangkok();
  const [edited, setEdited] = useState<string | null>(null);
  return [edited ?? today, setEdited];
}
