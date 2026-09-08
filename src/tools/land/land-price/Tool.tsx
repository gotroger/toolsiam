import { useState } from 'react';
import { landPrice, PRICE_UNITS, splitDownPayment, toRaiNganWa, UNIT_LABEL, type LandUnit } from './logic';
import { DataTable, ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const AREA_UNITS: LandUnit[] = ['rai', 'ngan', 'wa2', 'm2'];

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function LandPriceTool() {
  const [area, setArea] = useState('2');
  const [areaUnit, setAreaUnit] = useState<LandUnit>('rai');
  const [price, setPrice] = useState('25000');
  const [priceUnit, setPriceUnit] = useState<LandUnit>('wa2');
  const [downPercent, setDownPercent] = useState('20');

  let error = '';
  let result: ReturnType<typeof landPrice> | null = null;
  let down: ReturnType<typeof splitDownPayment> | null = null;
  try {
    result = landPrice({ area: num(area), areaUnit, pricePerUnit: num(price), priceUnit });
    down = splitDownPayment({ totalPrice: result.totalPrice, downPercent: num(downPercent) });
  } catch (e) {
    error = (e as Error).message;
  }

  const rnw = result ? toRaiNganWa(result.areaSqm) : null;
  const perUnitRows = result
    ? [
        { unit: 'rai' as LandUnit, value: result.pricePerRai },
        { unit: 'ngan' as LandUnit, value: result.pricePerNgan },
        { unit: 'wa2' as LandUnit, value: result.pricePerWa },
        { unit: 'm2' as LandUnit, value: result.pricePerSqm },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput id="area" label="ขนาดที่ดิน" mode="decimal" value={area} onValueChange={setArea} suffix={UNIT_LABEL[areaUnit]} />
        <Field label="หน่วยของขนาด" htmlFor="area-unit">
          <Select id="area-unit" value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as LandUnit)}>
            {AREA_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </Select>
        </Field>
        <NumberInput id="price" label="ราคาที่ประกาศขาย" mode="decimal" value={price} onValueChange={setPrice} suffix="บาท" />
        <Field label="ราคาต่อหน่วย" htmlFor="price-unit">
          <Select id="price-unit" value={priceUnit} onChange={(e) => setPriceUnit(e.target.value as LandUnit)}>
            {PRICE_UNITS.map((u) => <option key={u} value={u}>{`บาท / ${UNIT_LABEL[u]}`}</option>)}
          </Select>
        </Field>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && rnw && down && (
        <>
          <ResultBox label="ราคาที่ดินทั้งแปลง">{formatBaht(result.totalPrice)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="ขนาดแบบโฉนด" value={`${rnw.rai} ไร่ ${rnw.ngan} งาน ${formatNumber(rnw.wa2, 2)} ตารางวา`} />
            <Stat label="คิดเป็นตารางเมตร" value={`${formatNumber(result.areaSqm, 2)} ตร.ม.`} />
          </div>

          <div>
            <h2 className="mb-2 text-base font-medium text-slate-900">ราคาต่อหน่วยแบบต่าง ๆ</h2>
            <p className="mb-2 text-sm text-slate-600">ใช้เทียบกับประกาศขายแปลงอื่นที่บอกราคาคนละหน่วยกัน</p>
            <DataTable
              caption="ราคาต่อหน่วยของที่ดินแปลงนี้"
              columns={[
                { key: 'unit', header: 'หน่วย', render: (r) => `บาท / ${UNIT_LABEL[r.unit]}` },
                { key: 'value', header: 'ราคา', align: 'right', render: (r) => formatBaht(r.value) },
              ]}
              rows={perUnitRows}
              rowKey={(r) => r.unit}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberInput id="down" label="เงินดาวน์" mode="decimal" value={downPercent} onValueChange={setDownPercent} suffix="%" />
            <Stat label="เงินดาวน์" value={`${formatBaht(down.downPayment)} บาท`} />
            <Stat label="ส่วนที่ต้องกู้" value={`${formatBaht(down.financed)} บาท`} />
          </div>
        </>
      )}
    </div>
  );
}
