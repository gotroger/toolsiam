import { useState } from 'react';
import { BASIS_LABEL, sellingPrice, type PriceBasis } from './logic';
import { ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { getToolUrl } from '@/lib/routes';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function SellingPriceTool() {
  const [cost, setCost] = useState('100');
  const [basis, setBasis] = useState<PriceBasis>('margin');
  const [value, setValue] = useState('30');
  const [vat, setVat] = useState('7');

  let error = '';
  let result: ReturnType<typeof sellingPrice> | null = null;
  try {
    result = sellingPrice(num(cost), basis, num(value), num(vat));
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput id="cost" label="ต้นทุนต่อชิ้น" mode="decimal" value={cost} onValueChange={setCost} suffix="บาท" />
        <Field label="ตั้งราคาจาก" htmlFor="basis">
          <Select id="basis" value={basis} onChange={(e) => setBasis(e.target.value as PriceBasis)}>
            <option value="margin">มาร์จิ้น (% ของราคาขาย)</option>
            <option value="markup">มาร์กอัป (% ของต้นทุน)</option>
            <option value="profit">กำไรเป็นบาท</option>
          </Select>
        </Field>
        <NumberInput
          id="value"
          label={BASIS_LABEL[basis]}
          mode="decimal"
          value={value}
          onValueChange={setValue}
          suffix={basis === 'profit' ? 'บาท' : '%'}
          error={error || undefined}
        />
        <NumberInput
          id="vat"
          label="อัตรา VAT"
          mode="decimal"
          value={vat}
          onValueChange={setVat}
          suffix="%"
          hint="ใส่ 0 ถ้าไม่ได้จด VAT"
        />
      </div>

      {result && (
        <>
          <ResultBox label="ราคาขายที่ควรตั้ง (ก่อน VAT)">{formatBaht(result.price)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="กำไรต่อชิ้น" value={`${formatBaht(result.profit)} บาท`} />
            <Stat label="มาร์จิ้นที่ได้จริง" value={`${formatNumber(result.marginPercent, 2)}%`} />
            <Stat label="มาร์กอัปที่ได้จริง" value={`${formatNumber(result.markupPercent, 2)}%`} />
            <Stat label="ราคารวม VAT" value={`${formatBaht(result.priceWithVat)} บาท`} />
          </div>

          <p className="text-sm text-slate-600">
            อยากตรวจย้อนกลับว่าราคาที่ตั้งไว้ให้กำไรเท่าไหร่ ใช้{' '}
            <a href={getToolUrl('profit-margin')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณกำไรและมาร์จิ้น
            </a>{' '}
            หรือดูรายละเอียด VAT ที่{' '}
            <a href={getToolUrl('vat-wht')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณ VAT
            </a>
          </p>
        </>
      )}
    </div>
  );
}
