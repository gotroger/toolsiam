import { useId, useMemo, useState } from 'react';
import { CopyButton, DataTable, ErrorText, Field, NumberInput, Select, Tabs, TabPanel } from '@/components/ui';
import { AREA_UNITS, type AreaUnit } from '@/lib/land';
import { formatNumber } from '@/lib/format';
import { fromRaiNganWa, fromUnit, type AreaConversion } from './logic';

const MODES = [
  { id: 'deed', label: 'แบบโฉนด (ไร่-งาน-วา)' },
  { id: 'single', label: 'กรอกหน่วยเดียว' },
];

type Row = AreaConversion['rows'][number];

export default function LandAreaConvertTool() {
  const idPrefix = useId();
  const [mode, setMode] = useState('deed');
  const [rai, setRai] = useState('1');
  const [ngan, setNgan] = useState('2');
  const [wa, setWa] = useState('30');
  const [amount, setAmount] = useState('1');
  const [unit, setUnit] = useState<AreaUnit>('rai');

  const result = useMemo(() => {
    try {
      const value = mode === 'deed'
        ? fromRaiNganWa({ rai: Number(rai), ngan: Number(ngan), wa: Number(wa) })
        : fromUnit(Number(amount), unit);
      return { ok: true as const, value };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [mode, rai, ngan, wa, amount, unit]);

  return (
    <div className="space-y-5">
      <Tabs tabs={MODES} value={mode} onChange={setMode} label="วิธีกรอกขนาดที่ดิน" idPrefix={idPrefix} />

      <TabPanel id="deed" active={mode === 'deed'} idPrefix={idPrefix}>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput id="rai" label="ไร่" mode="decimal" value={rai} onValueChange={setRai} suffix="ไร่" />
          <NumberInput id="ngan" label="งาน" mode="decimal" value={ngan} onValueChange={setNgan} suffix="งาน" />
          <NumberInput id="wa" label="ตารางวา" mode="decimal" value={wa} onValueChange={setWa} suffix="ตร.ว." />
        </div>
      </TabPanel>

      <TabPanel id="single" active={mode === 'single'} idPrefix={idPrefix}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput id="amount" label="ขนาดที่ดิน" mode="decimal" value={amount} onValueChange={setAmount} />
          <Field label="หน่วย" htmlFor="unit">
            <Select id="unit" value={unit} onChange={(e) => setUnit(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        </div>
      </TabPanel>

      {!result.ok && <ErrorText>{result.error}</ErrorText>}

      {result.ok && (
        <>
          <div className="rounded-[10px] border border-brand-600/20 bg-brand-50 p-4" aria-live="polite">
            <div className="text-xs font-medium text-brand-700">ขนาดที่ดิน</div>
            <div className="mt-1 break-words text-lg font-semibold">{result.value.text}</div>
            <div className="mt-0.5 text-sm text-slate-600">{formatNumber(result.value.squareMeters, 2)} ตารางเมตร</div>
          </div>

          <DataTable<Row>
            caption="ขนาดที่ดินเดียวกันในทุกหน่วย"
            columns={[
              { key: 'unit', header: 'หน่วย', render: (r) => r.unit.name },
              {
                key: 'value',
                header: 'ขนาด',
                align: 'right',
                render: (r) => (
                  <>
                    {formatNumber(r.value, r.unit.digits)} <span className="text-slate-500">{r.unit.short}</span>
                  </>
                ),
              },
            ]}
            rows={result.value.rows}
            rowKey={(r) => r.unit.id}
          />

          <CopyButton text={result.value.summary} label="คัดลอกขนาดที่ดิน" />
        </>
      )}
    </div>
  );
}
