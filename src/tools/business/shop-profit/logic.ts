import { shopProfit, type ShopProfitInput, type ShopProfitResult } from '@/lib/pricing';

export type { ShopProfitInput, ShopProfitResult };
export { shopProfit };

/** ค่าธรรมเนียมที่มาร์เก็ตเพลสไทยคิดโดยประมาณ — ผู้ใช้ปรับได้ ไม่ใช่ตัวเลขทางการของแพลตฟอร์มใด */
export const CHANNEL_PRESETS: { id: string; label: string; feePercent: number }[] = [
  { id: 'own', label: 'ขายเองผ่านเพจ / LINE', feePercent: 0 },
  { id: 'marketplace', label: 'มาร์เก็ตเพลส (ค่าธรรมเนียมปานกลาง)', feePercent: 8 },
  { id: 'marketplace-high', label: 'มาร์เก็ตเพลส + ค่าโปรโมชัน', feePercent: 12 },
];
