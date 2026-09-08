import { useState } from 'react';
import { calculateWht, WHT_RATE_OPTIONS, type WhtMode } from './logic';
import { DataTable, ErrorText, Field, NumberInput, ResultBox, Select, Stat, Tabs, TabPanel } from '@/components/ui';
import { formatBaht } from '@/lib/format';
import { getToolUrl } from '@/lib/routes';

const ID = 'wht';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function WhtCalculatorTool() {
  const [mode, setMode] = useState<WhtMode>('fromBase');
  const [amount, setAmount] = useState('10000');
  const [whtRate, setWhtRate] = useState('0.03');
  const [vatRate, setVatRate] = useState('7');

  let error = '';
  let result: ReturnType<typeof calculateWht> | null = null;
  try {
    result = calculateWht({ amount: num(amount), mode, whtRate: Number(whtRate), vatRate: num(vatRate) / 100 });
  } catch (e) {
    error = (e as Error).message;
  }

  const selected = WHT_RATE_OPTIONS.find((o) => o.rate === Number(whtRate));

  return (
    <div className="space-y-6">
      <Tabs
        idPrefix={ID}
        label="ทิศทางการคำนวณ"
        value={mode}
        onChange={(v) => setMode(v as WhtMode)}
        tabs={[
          { id: 'fromBase', label: 'รู้ค่าบริการ → หาเงินที่จะได้รับ' },
          { id: 'fromNet', label: 'รู้เงินที่ได้รับ → หาค่าบริการ' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput
          id="amount"
          label={mode === 'fromBase' ? 'ค่าบริการก่อน VAT' : 'ยอดที่ได้รับจริงหลังหักแล้ว'}
          mode="decimal"
          value={amount}
          onValueChange={setAmount}
          suffix="บาท"
        />
        <Field label="ประเภทเงินได้" htmlFor="wht-rate" hint={selected?.examples}>
          <Select id="wht-rate" value={whtRate} onChange={(e) => setWhtRate(e.target.value)} aria-describedby="wht-rate-hint">
            {WHT_RATE_OPTIONS.map((o) => <option key={o.rate} value={String(o.rate)}>{o.label}</option>)}
          </Select>
        </Field>
        <NumberInput
          id="vat-rate"
          label="อัตรา VAT"
          mode="decimal"
          value={vatRate}
          onValueChange={setVatRate}
          suffix="%"
          hint="ใส่ 0 ถ้าผู้รับเงินไม่ได้จด VAT"
        />
      </div>

      <TabPanel id="fromBase" idPrefix={ID} active={mode === 'fromBase'}><span className="sr-only">คำนวณจากค่าบริการ</span></TabPanel>
      <TabPanel id="fromNet" idPrefix={ID} active={mode === 'fromNet'}><span className="sr-only">คำนวณย้อนกลับจากยอดที่ได้รับ</span></TabPanel>

      {error && <ErrorText>{error}</ErrorText>}

      {result && !error && (
        <>
          <ResultBox label={mode === 'fromBase' ? 'ผู้รับเงินได้รับจริง' : 'ค่าบริการก่อน VAT ที่ต้องเรียกเก็บ'}>
            {formatBaht(mode === 'fromBase' ? result.netReceived : result.base)} บาท
          </ResultBox>

          <DataTable
            caption="รายละเอียดการคำนวณภาษีหัก ณ ที่จ่าย"
            columns={[
              { key: 'item', header: 'รายการ', render: (r) => r.item },
              { key: 'amount', header: 'จำนวนเงิน', align: 'right', render: (r) => `${formatBaht(r.amount)} บาท` },
            ]}
            rows={[
              { item: 'ค่าบริการก่อน VAT (ฐานของการหัก ณ ที่จ่าย)', amount: result.base },
              { item: `VAT ${vatRate}%`, amount: result.vat },
              { item: 'ยอดตามใบกำกับภาษี', amount: result.invoiceTotal },
              { item: `หัก ณ ที่จ่าย ${Number(whtRate) * 100}%`, amount: -result.wht },
              { item: 'ยอดที่จ่ายให้ผู้รับเงิน', amount: result.netReceived },
            ]}
            rowKey={(r) => r.item}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="ยอดที่ต้องนำส่งสรรพากร" value={`${formatBaht(result.wht)} บาท`} />
            <Stat label="ยอดที่ผู้รับเงินได้รับ" value={`${formatBaht(result.netReceived)} บาท`} />
          </div>

          <p className="text-sm text-slate-600">
            ต้องการคำนวณหรือถอด VAT อย่างเดียว ใช้{' '}
            <a href={getToolUrl('vat-wht')} className="text-brand-700 underline underline-offset-2 hover:text-brand-800">
              เครื่องมือคำนวณ VAT
            </a>
          </p>
        </>
      )}
    </div>
  );
}
