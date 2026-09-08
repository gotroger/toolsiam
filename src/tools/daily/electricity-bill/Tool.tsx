import { useMemo, useState } from 'react';
import { useTodayInBangkok } from '@/lib/use-today';
import {
  calculateBill,
  COMMON_APPLIANCES,
  ftAt,
  residentialTariffsAt,
  RESIDENTIAL_TARIFFS,
  totalUnits,
  unitsPerMonth,
  UTILITY_LABEL,
  VAT,
  type Utility,
} from './logic';
import {
  cellField,
  DataTable,
  ErrorText,
  Field,
  NumberInput,
  ResultBox,
  Select,
  Stat,
  Tabs,
  TabPanel,
} from '@/components/ui';
import { formatThaiDate } from '@/lib/thai-date';
import { formatBaht, formatNumber } from '@/lib/format';

const ID = 'bill';
const BILLING_MONTHS = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const monthLabel = (month: string) => formatThaiDate(`${month}-01`, { style: 'medium' }).replace(/^1 /, '');

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function ElectricityBillTool() {
  const [mode, setMode] = useState('units');
  const [utility, setUtility] = useState<Utility>('mea');
  const [tariffId, setTariffId] = useState('large');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [units, setUnits] = useState('350');
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(COMMON_APPLIANCES.map((a) => [a.id, String(a.hoursPerDay)])),
  );
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(COMMON_APPLIANCES.map((a) => [a.id, a.id === 'fridge' ? '1' : '0'])),
  );

  // งวด Ft ขึ้นกับวันที่ จึงต้องอิงวันไทย ไม่ใช่เครื่องผู้ใช้ (§27 D2)
  const today = useTodayInBangkok();

  const billingMonth = selectedMonth ?? today.slice(0, 7);
  const billingDate = billingMonth ? `${billingMonth}-01` : '';
  const ft = ftAt(billingDate);
  const datedTariffs = residentialTariffsAt(utility, billingDate);
  const tariffs = datedTariffs ?? RESIDENTIAL_TARIFFS[utility];
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
  if (ft && datedTariffs) {
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
            {(['mea', 'pea'] as Utility[]).map((u) => (
              <option key={u} value={u}>
                {UTILITY_LABEL[u]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="อัตราค่าไฟที่ใช้" htmlFor="tariff" hint={tariff.eligibility}>
          <Select
            id="tariff"
            value={tariffId}
            onChange={(e) => setTariffId(e.target.value)}
            aria-describedby="tariff-hint"
          >
            {tariffs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="ค่าไฟฟ้าประจำเดือน"
          htmlFor="billing-month"
          hint="เลือกเดือนจากช่องประจำเดือนในบิล เพื่อใช้อัตราฐานและค่า Ft ให้ตรงงวด"
        >
          <Select
            id="billing-month"
            value={billingMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            aria-describedby="billing-month-hint"
          >
            {!billingMonth && <option value="">กำลังเลือกเดือนปัจจุบัน…</option>}
            {billingMonth && !BILLING_MONTHS.includes(billingMonth) && (
              <option value={billingMonth}>{monthLabel(billingMonth)} — ยังไม่มีข้อมูลอัตรา</option>
            )}
            {BILLING_MONTHS.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </Select>
        </Field>
        {datedTariffs && ft && (
          <div className="self-center text-sm leading-relaxed text-slate-600">
            <p>
              {billingMonth < '2026-09' ? 'โครงสร้างอัตราก่อนกันยายน 2569' : 'โครงสร้างอัตราใหม่ เริ่มกันยายน 2569'}
            </p>
            <p>
              ค่า Ft {ft.ratePerUnit.toFixed(4)} บาท/หน่วย · VAT {formatNumber(VAT.rate * 100)}%
            </p>
          </div>
        )}
      </div>
      {billingMonth && (!ft || !datedTariffs) && (
        <ErrorText>ยังไม่มีอัตราที่ตรวจสอบแล้วสำหรับเดือนนี้ กรุณาเลือกเดือนที่มีข้อมูลในระบบ</ErrorText>
      )}

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
            กรอกจำนวนเครื่องและชั่วโมงใช้งานต่อวัน ระบบคิดที่ 30 วันต่อเดือน กำลังไฟที่แสดงเป็นค่าประมาณ
            ปรับชั่วโมงให้ตรงกับการใช้จริงเพื่อผลที่ใกล้เคียงขึ้น
          </p>
          <DataTable
            caption="เครื่องใช้ไฟฟ้าและจำนวนหน่วยที่ใช้ต่อเดือน"
            rows={COMMON_APPLIANCES}
            rowKey={(a) => a.id}
            columns={[
              {
                key: 'name',
                header: 'เครื่องใช้ไฟฟ้า',
                render: (a) => <label htmlFor={`count-${a.id}`}>{a.name}</label>,
              },
              { key: 'watts', header: 'วัตต์', align: 'right', render: (a) => formatNumber(a.watts) },
              {
                key: 'count',
                header: 'จำนวน',
                render: (a) => (
                  <input
                    id={`count-${a.id}`}
                    type="text"
                    inputMode="numeric"
                    value={counts[a.id]}
                    onChange={(e) => setCounts((p) => ({ ...p, [a.id]: e.target.value }))}
                    className={cellField}
                  />
                ),
              },
              {
                key: 'hours',
                header: 'ชม./วัน',
                render: (a) => (
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`ชั่วโมงใช้งานต่อวันของ${a.name}`}
                    value={hours[a.id]}
                    onChange={(e) => setHours((p) => ({ ...p, [a.id]: e.target.value }))}
                    className={cellField}
                  />
                ),
              },
              {
                key: 'units',
                header: 'หน่วย/เดือน',
                align: 'right',
                render: (a) => {
                  const q = num(counts[a.id]);
                  const h = num(hours[a.id]);
                  const u =
                    Number.isFinite(q) && Number.isFinite(h) && h >= 0 && h <= 24
                      ? Math.round(unitsPerMonth(a.watts, h) * q * 100) / 100
                      : 0;
                  return formatNumber(u, 2);
                },
              },
            ]}
          />
          <p className="text-sm font-medium text-slate-800">
            รวม {Number.isFinite(applianceUnits) ? formatNumber(applianceUnits, 2) : '—'} หน่วยต่อเดือน
          </p>
        </div>
      </TabPanel>

      {error && <ErrorText>{error}</ErrorText>}

      {bill && ft && (
        <>
          <ResultBox label={`ค่าไฟโดยประมาณ · ${monthLabel(billingMonth)}`}>{formatBaht(bill.total)} บาท</ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ค่าพลังงานไฟฟ้า" value={`${formatBaht(bill.energyCharge)} บาท`} />
            <Stat label="ค่าบริการรายเดือน" value={`${formatBaht(bill.serviceCharge)} บาท`} />
            <Stat label={`ค่า Ft (${ft.label})`} value={`${formatBaht(bill.ftCharge)} บาท`} />
            <Stat label={`VAT ${formatNumber(VAT.rate * 100, 0)}%`} value={`${formatBaht(bill.vat)} บาท`} />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <p>
              ค่าไฟฟ้าฐาน (ค่าพลังงาน + ค่าบริการ){' '}
              <strong className="text-slate-900">{formatBaht(bill.energyCharge + bill.serviceCharge)} บาท</strong>
            </p>
            <p>
              รวมก่อน VAT <strong className="text-slate-900">{formatBaht(bill.subtotal)} บาท</strong>
            </p>
          </div>

          {bill.lines.length > 0 && (
            <div>
              <h2 className="mb-2 text-base font-medium text-slate-900">ค่าพลังงานแยกตามขั้น</h2>
              <DataTable
                caption="ค่าพลังงานไฟฟ้าแยกตามขั้นบันไดของอัตราที่เลือก"
                columns={[
                  {
                    key: 'range',
                    header: 'ช่วงหน่วย',
                    render: (l) => (l.to === Infinity ? `${l.from} ขึ้นไป` : `${l.from}–${l.to}`),
                  },
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
            เฉลี่ยหน่วยละ {formatBaht(bill.averagePerUnit)} บาท (รวมค่าบริการ ค่า Ft และ VAT แล้ว) จาก{' '}
            {formatNumber(bill.units, 2)} หน่วย
          </p>
        </>
      )}
    </div>
  );
}
