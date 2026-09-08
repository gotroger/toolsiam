import { useState } from 'react';
import { batchProfit } from './logic';
import { ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { getToolUrl } from '@/lib/routes';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function ProfitMarginTool() {
  const [cost, setCost] = useState('100');
  const [price, setPrice] = useState('150');
  const [quantity, setQuantity] = useState('1');

  let error = '';
  let result: ReturnType<typeof batchProfit> | null = null;
  try {
    result = batchProfit({ cost: num(cost), price: num(price), quantity: num(quantity) });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput id="cost" label="ต้นทุนต่อชิ้น" mode="decimal" value={cost} onValueChange={setCost} suffix="บาท" />
        <NumberInput id="price" label="ราคาขายต่อชิ้น" mode="decimal" value={price} onValueChange={setPrice} suffix="บาท" />
        <NumberInput id="quantity" label="จำนวนที่ขาย" mode="numeric" value={quantity} onValueChange={setQuantity} suffix="ชิ้น" />
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="กำไรต่อชิ้น">
            {formatBaht(result.profit)} บาท ({formatNumber(result.marginPercent, 2)}% ของราคาขาย)
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="มาร์จิ้น (จากราคาขาย)" value={`${formatNumber(result.marginPercent, 2)}%`} />
            <Stat label="มาร์กอัป (จากต้นทุน)" value={`${formatNumber(result.markupPercent, 2)}%`} />
            <Stat label="ยอดขายรวม" value={`${formatBaht(result.totalRevenue)} บาท`} />
            <Stat label="กำไรรวม" value={`${formatBaht(result.totalProfit)} บาท`} />
          </div>

          <p className="text-sm text-slate-600">
            ถ้าอยากทำย้อนกลับ — รู้ต้นทุนและกำไรที่ต้องการ แล้วหาว่าควรตั้งราคาเท่าไหร่ — ใช้{' '}
            <a href={getToolUrl('selling-price')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณราคาขายจากต้นทุน
            </a>
          </p>
        </>
      )}
    </div>
  );
}
