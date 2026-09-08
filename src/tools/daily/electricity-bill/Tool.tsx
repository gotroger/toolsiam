import { useEffect, useMemo, useState } from 'react';
import {
  calculateBill, COMMON_APPLIANCES, ftAt, latestFt, RESIDENTIAL_TARIFFS, totalUnits, unitsPerMonth,
  UTILITY_LABEL, VAT, type Utility,
} from './logic';
import { DataTable, Disclaimer, ErrorText, Field, NumberInput, ResultBox, Select, Stat, Tabs, TabPanel } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';
import { todayInBangkok } from '@/lib/today';

const ID = 'bill';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function ElectricityBillTool() {
  const [mode, setMode] = useState('units');
  const [utility, setUtility] = useState<Utility>('mea');
  const [tariffId, setTariffId] = useState('large');
  const [units, setUnits] = useState('350');
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(COMMON_APPLIANCES.map((a) => [a.id, String(a.hoursPerDay)])),
  );
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(COMMON_APPLIANCES.map((a) => [a.id, a.id === 'fridge' ? '1' : '0'])),
  );
  const [today, setToday] = useState('');

  // งวด Ft ขึ้นกับวันที่ จึงต้องอิงวันไทย ไม่ใช่เครื่องผู้ใช้ (§27 D2)
  useEffect(() => { setToday(todayInBangkok()); }, []);

  const ft = today === '' ? null : (ftAt(today) ?? latestFt());
  const ftIsCurrent = today !== '' && ftAt(today) !== null;
  const tariffs = RESIDENTIAL_TARIFFS[utility];
  const tariff = tariffs.find((t) => t.id === tariffId) ?? tariffs[0];

  const applianceUnits = useMemo(() => {
    try {
      return totalUnits(
        COMMON_APPLIANCES.map((a) => ({ appliance: a, quantity: num(counts[a.id]), hoursPerDay: num(hours[a.id]) })),
      );
    } catch {
      return Number.NaN;
    }
  }, [counts, hours]);

  const usedUnits = mode === 'units' ? num(units) : applianceUnits;

  let error = '';
  let bill: ReturnType<typeof calculateBill> | null = null;
  if (ft) {
    try {
      bill = calculateBill(usedUnits, tariff, ft.ratePerUnit, VAT.rate);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="การไฟฟ้าที่ให้บริการ" htmlFor="utility">
          <Select id="utility" value={utility} onChange={(e) => setUtility(e.target.value as Utility)}>
            {(['mea', 'pea'] as Utility[]).map((u) => <option key={u} value={u}>{UTILITY_LABEL[u]}</option>)}
          </Select>
        </Field>
        <Field label="อัตราค่าไฟที่ใช้" htmlFor="tariff" hint={tariff.eligibility}>
          <Select id="tariff" value={tariffId} onChange={(e) => setTariffId(e.target.value)} aria-describedby="tariff-hint">
            {tariffs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Field>
      </div>

      <Tabs
        idPrefix={ID}
        label="วิธีระบุจำนวนหน่วยไฟ"
        value={mode}
        onChange={setMode}
        tabs={[
          { id: 'units', label: 'กรอกหน่วยจากใบแจ้งค่าไฟ' },
          { id: 'appliance', label: 'คำนวณจากเครื่องใช้ไฟฟ้า' },
        ]}
      />

      <TabPanel id="units" idPrefix={ID} active={mode === 'units'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="units"
            label="จำนวนหน่วยที่ใช้ในเดือนนี้"
            mode="decimal"
            value={units}
            onValueChange={setUnits}
            suffix="หน่วย"
            hint="ดูจากช่อง “หน่วยที่ใช้” ในใบแจ้งค่าไฟ"
          />
        </div>
      </TabPanel>

      <TabPanel id="appliance" idPrefix={ID} active={mode === 'appliance'}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            กรอกจำนวนเครื่องและชั่วโมงใช้งานต่อวัน ระบบคิดที่ 30 วันต่อเดือน
            กำลังไฟที่แสดงเป็นค่าประมาณ ปรับชั่วโมงให้ตรงกับการใช้จริงเพื่อผลที่ใกล้เคียงขึ้น
          </p>
          <div className="overflow-x-auto rounded-[10px] border border-slate-200">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">เครื่องใช้ไฟฟ้าและจำนวนหน่วยที่ใช้ต่อเดือน</caption>
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th scope="col" className="border-b border-slate-200 px-3 py-2 font-medium">เครื่องใช้ไฟฟ้า</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2 text-right font-medium">วัตต์</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2 font-medium">จำนวน</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2 font-medium">ชม./วัน</th>
                  <th scope="col" className="border-b border-slate-200 px-3 py-2 text-right font-medium">หน่วย/เดือน</th>
                </tr>
              </thead>
              <tbody>
                {COMMON_APPLIANCES.map((a) => {
                  const q = num(counts[a.id]);
                  const h = num(hours[a.id]);
                  const u = Number.isFinite(q) && Number.isFinite(h) && h >= 0 && h <= 24
                    ? Math.round(unitsPerMonth(a.watts, h) * q * 100) / 100
                    : 0;
                  return (
                    <tr key={a.id} className="even:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2">
                        <label htmlFor={`count-${a.id}`}>{a.name}</label>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums text-slate-600">{a.watts.toLocaleString('en-US')}</td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          id={`count-${a.id}`}
                          type="text"
                          inputMode="numeric"
                          value={counts[a.id]}
                          onChange={(e) => setCounts((p) => ({ ...p, [a.id]: e.target.value }))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`ชั่วโมงใช้งานต่อวันของ${a.name}`}
                          value={hours[a.id]}
                          onChange={(e) => setHours((p) => ({ ...p, [a.id]: e.target.value }))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
                        />
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right tabular-nums">{formatNumber(u, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm font-medium text-slate-800">
            รวม {Number.isFinite(applianceUnits) ? formatNumber(applianceUnits, 2) : '—'} หน่วยต่อเดือน
          </p>
        </div>
      </TabPanel>

      {error && <ErrorText>{error}</ErrorText>}

      {bill && ft && (
        <>
          <ResultBox label="ค่าไฟโดยประมาณทั้งเดือน">{formatBaht(bill.total)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ค่าพลังงานไฟฟ้า" value={`${formatBaht(bill.energyCharge)} บาท`} />
            <Stat label="ค่าบริการรายเดือน" value={`${formatBaht(bill.serviceCharge)} บาท`} />
            <Stat label={`ค่า Ft (${ft.label})`} value={`${formatBaht(bill.ftCharge)} บาท`} />
            <Stat label={`VAT ${formatNumber(VAT.rate * 100, 0)}%`} value={`${formatBaht(bill.vat)} บาท`} />
          </div>

          {!ftIsCurrent && (
            <Disclaimer>
              ยังไม่มีข้อมูลค่า Ft ของงวดปัจจุบันในระบบ กำลังใช้ค่าของงวด {ft.label} ({ft.ratePerUnit} บาท/หน่วย)
              ค่า Ft ปรับทุก 4 เดือน ให้ตรวจกับประกาศของ กกพ. หรือการไฟฟ้าอีกครั้ง
            </Disclaimer>
          )}

          {bill.lines.length > 0 && (
            <div>
              <h2 className="mb-2 text-base font-semibold text-slate-900">ค่าพลังงานแยกตามขั้น</h2>
              <DataTable
                caption="ค่าพลังงานไฟฟ้าแยกตามขั้นบันไดของอัตราที่เลือก"
                columns={[
                  { key: 'range', header: 'ช่วงหน่วย', render: (l) => (l.to === Infinity ? `${l.from} ขึ้นไป` : `${l.from}–${l.to}`) },
                  { key: 'units', header: 'หน่วย', align: 'right', render: (l) => formatNumber(l.units, 2) },
                  { key: 'rate', header: 'บาท/หน่วย', align: 'right', render: (l) => l.ratePerUnit.toFixed(4) },
                  { key: 'amount', header: 'เป็นเงิน', align: 'right', render: (l) => formatBaht(l.amount) },
                ]}
                rows={bill.lines}
                rowKey={(l) => String(l.from)}
              />
            </div>
          )}

          <p className="text-sm text-slate-600">
            เฉลี่ยหน่วยละ {formatBaht(bill.averagePerUnit)} บาท (รวมค่าบริการ ค่า Ft และ VAT แล้ว) จาก {formatNumber(bill.units, 2)} หน่วย
          </p>
        </>
      )}
    </div>
  );
}
