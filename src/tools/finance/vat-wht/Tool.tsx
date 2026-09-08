import { useState } from 'react';
import { VAT_RATE, WHT_RATES, calculateInvoice } from './logic';
import { formatBaht, formatNumber } from '@/lib/format';
import { ErrorText, Field, Input, Select, Stat } from '@/components/ui';

export default function VatWhtTool() {
  const [amount, setAmount] = useState('1000');
  const [mode, setMode] = useState<'add' | 'extract'>('add');
  const [whtRate, setWhtRate] = useState('0');

  const parsed = Number(amount.replace(/,/g, ''));
  let result: ReturnType<typeof calculateInvoice> | null = null;
  let error = '';
  try {
    result = calculateInvoice({
      amount: Number.isFinite(parsed) ? parsed : 0,
      mode,
      vatRate: VAT_RATE,
      whtRate: Number(whtRate),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ยอดเงิน (บาท)" htmlFor="amount">
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="ยอดที่กรอก" htmlFor="mode">
          <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as 'add' | 'extract')}>
            <option value="add">ยังไม่รวม VAT</option>
            <option value="extract">รวม VAT แล้ว</option>
          </Select>
        </Field>
        <Field label="ภาษีหัก ณ ที่จ่าย" htmlFor="wht">
          <Select id="wht" value={whtRate} onChange={(e) => setWhtRate(e.target.value)}>
            <option value="0">ไม่หัก</option>
            {WHT_RATES.map((w) => (
              <option key={w.rate} value={w.rate}>
                {w.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="ราคาก่อน VAT" value={`${formatBaht(result.base)} บาท`} />
          <Stat label={`VAT ${formatNumber(VAT_RATE * 100)}%`} value={`${formatBaht(result.vat)} บาท`} />
          <Stat label="ยอดรวม" value={`${formatBaht(result.total)} บาท`} />
          <Stat label="หัก ณ ที่จ่าย" value={`${formatBaht(result.wht)} บาท`} />
          <Stat label="ยอดจ่ายจริง" value={`${formatBaht(result.payable)} บาท`} />
        </div>
      )}
    </div>
  );
}
