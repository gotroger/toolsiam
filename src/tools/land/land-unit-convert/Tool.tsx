import { useState } from 'react';
import { convertToAllUnits, toRaiNganWa, UNIT_LABEL, UNIT_ORDER, type LandUnit } from './logic';
import { DataTable, ErrorText, Field, NumberInput, ResultBox, Select } from '@/components/ui';
import { formatNumber } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

/** พื้นที่ต่างกันหลายพันเท่าในหน้าเดียว จึงเลือกจำนวนทศนิยมตามขนาดของค่า */
function smart(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1000) return formatNumber(n, 0);
  if (abs >= 1) return formatNumber(n, 2);
  return formatNumber(n, 4);
}

export default function LandUnitConvertTool() {
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState<LandUnit>('rai');

  let error = '';
  let rows: ReturnType<typeof convertToAllUnits> = [];
  let rnw = { rai: 0, ngan: 0, wa2: 0 };
  try {
    rows = convertToAllUnits(num(value), unit);
    rnw = toRaiNganWa(rows.find((r) => r.unit === 'm2')!.value);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          id="value"
          label="พื้นที่"
          mode="decimal"
          value={value}
          onValueChange={setValue}
          suffix={UNIT_LABEL[unit]}
          error={error || undefined}
        />
        <Field label="หน่วยที่กรอก" htmlFor="unit">
          <Select id="unit" value={unit} onChange={(e) => setUnit(e.target.value as LandUnit)}>
            {UNIT_ORDER.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
          </Select>
        </Field>
      </div>

      {error ? <ErrorText>{error}</ErrorText> : (
        <>
          <ResultBox label="เขียนแบบโฉนด">
            {rnw.rai} ไร่ {rnw.ngan} งาน {smart(rnw.wa2)} ตารางวา
          </ResultBox>

          <DataTable
            caption="พื้นที่เดียวกันในทุกหน่วย"
            columns={[
              { key: 'label', header: 'หน่วย', render: (r) => r.label },
              { key: 'value', header: 'พื้นที่', align: 'right', render: (r) => smart(r.value) },
            ]}
            rows={rows}
            rowKey={(r) => r.unit}
          />
        </>
      )}
    </div>
  );
}
