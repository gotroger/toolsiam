import { parseIsoDate } from '@/lib/date';
import { DRAW_DATE_CHANGES } from './data/schedule';

/** วันที่ออกรางวัลตามกำหนดปกติของทุกเดือน */
export const REGULAR_DRAW_DAYS = [1, 16] as const;

const changeByScheduled = new Map(DRAW_DATE_CHANGES.map((c) => [c.scheduled, c.actual]));

/** วันออกรางวัลจริงของงวดที่ตามกำหนดปกติตรงกับ `scheduled` */
export function actualDrawDate(scheduled: string): string {
  return changeByScheduled.get(scheduled) ?? scheduled;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * วันออกรางวัลทั้งปี เรียงจากต้นปีไปท้ายปี
 *
 * งวดที่ถูกเลื่อนใช้วันจริงจาก DRAW_DATE_CHANGES แล้วจึงเรียงใหม่ — งวดที่เลื่อน
 * ข้ามเดือนจึงยังอยู่ถูกตำแหน่งในลำดับ
 */
export function scheduledDrawDates(year: number): string[] {
  if (!Number.isInteger(year) || year < 1) throw new Error('ปีต้องเป็นจำนวนเต็มบวก');
  const dates: string[] = [];
  for (let month = 1; month <= 12; month++) {
    for (const day of REGULAR_DRAW_DAYS) dates.push(actualDrawDate(`${year}-${pad(month)}-${pad(day)}`));
  }
  return dates.sort();
}

/**
 * งวดถัดไปนับจากวันที่กำหนด (นับวันนั้นด้วยถ้าเป็นวันออกรางวัล)
 *
 * มองข้ามปีได้ เพราะงวด 1 มกราคมอยู่คนละปีกับ 16 ธันวาคม
 */
export function upcomingDrawDates(fromIso: string, count = 3): string[] {
  parseIsoDate(fromIso);
  if (!Number.isInteger(count) || count < 1) throw new Error('จำนวนงวดต้องเป็นจำนวนเต็มบวก');
  const startYear = Number(fromIso.slice(0, 4));
  const out: string[] = [];
  for (let year = startYear; year <= startYear + 2 && out.length < count; year++) {
    for (const d of scheduledDrawDates(year)) {
      if (d >= fromIso && out.length < count) out.push(d);
    }
  }
  return out;
}

export function nextDrawDate(fromIso: string): string {
  return upcomingDrawDates(fromIso, 1)[0];
}
