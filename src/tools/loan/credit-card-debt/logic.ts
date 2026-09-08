import { payoffSchedule, type RevolvingResult } from '@/lib/loan';

export type { RevolvingResult };
export { payoffSchedule };

export interface CardDebtInput {
  balance: number;
  /** ดอกเบี้ยและค่าธรรมเนียมรวมต่อปี (ทศนิยม) */
  annualRate: number;
  monthlyPayment: number;
}

export interface CardDebtComparison {
  monthlyPayment: number;
  months: number;
  totalInterest: number;
  totalPaid: number;
  /** null = จ่ายน้อยกว่าดอกเบี้ย หนี้ไม่มีวันหมด */
  feasible: boolean;
}

/** อัตราขั้นต่ำที่มักถูกเรียกเก็บ — ผู้ใช้ปรับได้ ไม่ใช่ค่าที่ผูกกับผู้ออกบัตรรายใด */
export const MINIMUM_PAYMENT_RATE = 0.08;

/** ยอดชำระขั้นต่ำตามเปอร์เซ็นต์ของยอดคงเหลือ */
export function minimumPayment(balance: number, rate = MINIMUM_PAYMENT_RATE): number {
  if (!Number.isFinite(balance) || balance < 0) throw new Error('ยอดหนี้ต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) throw new Error('อัตราชำระขั้นต่ำต้องอยู่ระหว่าง 0–100%');
  return Math.round(balance * rate * 100) / 100;
}

/**
 * เทียบผลของการจ่ายหลายระดับในตารางเดียว
 *
 * จุดสำคัญของเครื่องมือนี้คือให้เห็นว่าเพิ่มเงินอีกไม่กี่พันต่อเดือน
 * ย่นเวลาปลดหนี้ได้เป็นปี — ตัวเลือกที่จ่ายน้อยกว่าดอกเบี้ยจะถูกทำเครื่องหมายว่าเป็นไปไม่ได้
 * แทนที่จะหายไปจากตาราง เพราะการเห็นว่า "จ่ายเท่านี้แล้วหนี้ไม่ลด" คือข้อมูลที่มีค่าที่สุด
 */
export function comparePayments(balance: number, annualRate: number, payments: number[]): CardDebtComparison[] {
  return payments.map((monthlyPayment) => {
    try {
      const r = payoffSchedule(balance, annualRate, monthlyPayment);
      return { monthlyPayment, months: r.months, totalInterest: r.totalInterest, totalPaid: r.totalPaid, feasible: true };
    } catch {
      return { monthlyPayment, months: 0, totalInterest: 0, totalPaid: 0, feasible: false };
    }
  });
}
