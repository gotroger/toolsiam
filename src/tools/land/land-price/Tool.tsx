import { useId, useMemo, useState } from 'react';
import { CopyButton, ErrorText, NumberInput, ResultBox, Stat, Tabs, TabPanel } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { PRICE_BASES, priceFromRate, priceFromTotal, type PriceBasis } from './logic';

const MODES = [
  { id: 'rate', label: 'รู้ราคาต่อหน่วย' },
  { id: 'total', label: 'รู้ราคารวม' },
];

export default function LandPriceTool() {
  const idPrefix = useId();
  const [mode, setMode] = useState('rate');
  const [rai, setRai] = useState('1');
  const [ngan, setNgan] = useState('0');
  const [wa, setWa] = useState('0');
  const [rate, setRate] = useState('25000');
  const [basis, setBasis] = useState<PriceBasis>('squareWa');
  const [total, setTotal] = useState('10000000');

  const result = useMemo(() => {
    const area = { rai: Number(rai), ngan: Number(ngan), wa: Number(wa) };
    try {
      return { ok: true as const, value: mode === 'rate' ? priceFromRate(area, Number(rate), basis) : priceFromTotal(area, Number(total)) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [mode, rai, ngan, wa, rate, basis, total]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput id="rai" label="ไร่" mode="decimal" value={rai} onValueChange={setRai} suffix="ไร่" />
        <NumberInput id="ngan" label="งาน" mode="decimal" value={ngan} onValueChange={setNgan} suffix="งาน" />
        <NumberInput id="wa" label="ตารางวา" mode="decimal" value={wa} onValueChange={setWa} suffix="ตร.ว." />
      </div>

      <Tabs tabs={MODES} value={mode} onChange={setMode} label="สิ่งที่รู้อยู่แล้ว" idPrefix={idPrefix} />

      <TabPanel id="rate" active={mode === 'rate'} idPrefix={idPrefix}>
        <div className="space-y-3">
          <NumberInput
            id="rate"
            label={`ราคา${PRICE_BASES.find((b) => b.id === basis)!.label}`}
            mode="decimal"
            value={rate}
            onValueChange={setRate}
            suffix="บาท"
          />
          <div role="group" aria-label="หน่วยของราคาที่กรอก" className="flex flex-wrap gap-2">
            {PRICE_BASES.map((b) => (
              <button
                key={b.id}
                type="button"
                aria-pressed={basis === b.id}
                onClick={() => setBasis(b.id)}
                className={`rounded-[10px] border px-3 py-1.5 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                  basis === b.id ? 'border-brand-600 bg-brand-50 font-medium text-brand-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </TabPanel>

      <TabPanel id="total" active={mode === 'total'} idPrefix={idPrefix}>
        <NumberInput id="total" label="ราคารวมทั้งแปลง" mode="decimal" value={total} onValueChange={setTotal} suffix="บาท" />
      </TabPanel>

      {!result.ok && <ErrorText>{result.error}</ErrorText>}

      {result.ok && (
        <>
          <ResultBox label={`ราคารวมของที่ดิน ${result.value.areaText}`}>
            {formatBaht(result.value.total)} บาท
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-3">
            {result.value.perUnit.map((p) => (
              <Stat key={p.basis} label={`ราคา${p.label}`} value={`${formatBaht(p.value)} บาท`} />
            ))}
          </div>

          <p className="text-sm text-slate-600">
            ที่ดินแปลงนี้มีขนาด {result.value.areaText} หรือ {formatNumber(result.value.squareMeters, 2)} ตารางเมตร
          </p>

          <CopyButton text={result.value.summary} label="คัดลอกสรุปราคา" />
        </>
      )}
    </div>
  );
}
