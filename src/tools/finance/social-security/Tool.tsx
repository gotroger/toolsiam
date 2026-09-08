import { useState } from 'react';
import { useTodayInBangkok } from '@/lib/use-today';
import {
  SECTION_40_OPTIONS, section33Yearly, section39Contribution, section40Total, SECTION_39, SECTION_LABEL,
  type SsoSection,
} from './logic';
import { DataTable, ErrorText, Field, NumberInput, ResultBox, Select, Stat, Tabs, TabPanel } from '@/components/ui';
import { formatBaht } from '@/lib/format';

const ID = 'sso';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function SocialSecurityTool() {
  const [section, setSection] = useState<SsoSection>('33');
  const [salary, setSalary] = useState('20000');
  const [option, setOption] = useState<'1' | '2' | '3'>('1');
  const [extra, setExtra] = useState('0');

  // เพดานค่าจ้างขึ้นกับวันที่ จึงต้องใช้ "วันนี้" ตามเวลาไทย ไม่ใช่ของเครื่องผู้ใช้ (§27 D2)
  const asOf = useTodayInBangkok();

  let error = '';
  let s33: ReturnType<typeof section33Yearly> | null = null;
  let s40: ReturnType<typeof section40Total> | null = null;
  if (asOf !== '') {
    try {
      if (section === '33') s33 = section33Yearly(num(salary), asOf);
      if (section === '40') s40 = section40Total(Number(option) as 1 | 2 | 3, num(extra));
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const s39 = section39Contribution();

  return (
    <div className="space-y-6">
      <Tabs
        idPrefix={ID}
        label="มาตราของผู้ประกันตน"
        value={section}
        onChange={(v) => setSection(v as SsoSection)}
        tabs={[
          { id: '33', label: 'มาตรา 33' },
          { id: '39', label: 'มาตรา 39' },
          { id: '40', label: 'มาตรา 40' },
        ]}
      />
      <p className="text-sm text-slate-600">{SECTION_LABEL[section]}</p>

      <TabPanel id="33" idPrefix={ID} active={section === '33'}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberInput id="salary" label="ค่าจ้างต่อเดือน" mode="decimal" value={salary} onValueChange={setSalary} suffix="บาท" />
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          {s33 && (
            <>
              <ResultBox label="ผู้ประกันตนส่งเดือนละ">{formatBaht(s33.employee)} บาท</ResultBox>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="ฐานที่ใช้คำนวณ" value={`${formatBaht(s33.base)} บาท`} />
                <Stat label="นายจ้างสมทบ" value={`${formatBaht(s33.employer)} บาท`} />
                <Stat label="รัฐบาลสมทบ" value={`${formatBaht(s33.government)} บาท`} />
                <Stat label="ผู้ประกันตนส่งทั้งปี" value={`${formatBaht(s33.employeeYearly)} บาท`} />
              </div>
              <p className="text-sm text-slate-600">
                ฐานค่าจ้างที่ใช้คำนวณอยู่ระหว่าง {formatBaht(s33.cap.minBase)} – {formatBaht(s33.cap.maxBase)} บาทต่อเดือน
                (เพดานนี้มีผลตั้งแต่ {s33.cap.effectiveFrom}) ค่าจ้างส่วนที่เกินเพดานไม่ถูกนำมาคิดเงินสมทบ
              </p>
            </>
          )}
        </div>
      </TabPanel>

      <TabPanel id="39" idPrefix={ID} active={section === '39'}>
        <div className="space-y-6">
          <ResultBox label="ผู้ประกันตน ม.39 ส่งเดือนละ">{formatBaht(s39)} บาท</ResultBox>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="ฐานคำนวณ" value={`${formatBaht(SECTION_39.base)} บาท`} />
            <Stat label="อัตราเงินสมทบ" value={`${SECTION_39.rate * 100}%`} />
            <Stat label="ส่งทั้งปี" value={`${formatBaht(s39 * 12)} บาท`} />
          </div>
          <p className="text-sm text-slate-600">
            มาตรา 39 ใช้ฐานคำนวณเท่ากันทุกคน ยอดจึงไม่ขึ้นกับรายได้จริง ต้องส่งภายในวันที่ 15 ของทุกเดือน
            เกินกำหนดเสียเงินเพิ่มร้อยละ 2 ต่อเดือน
          </p>
        </div>
      </TabPanel>

      <TabPanel id="40" idPrefix={ID} active={section === '40'}>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ทางเลือกความคุ้มครอง" htmlFor="option">
              <Select id="option" value={option} onChange={(e) => setOption(e.target.value as '1' | '2' | '3')}>
                {SECTION_40_OPTIONS.map((o) => (
                  <option key={o.option} value={String(o.option)}>
                    {`ทางเลือกที่ ${o.option} — ${o.contribution} บาท/เดือน (${o.cases} กรณี)`}
                  </option>
                ))}
              </Select>
            </Field>
            <NumberInput
              id="extra"
              label="เงินออมเพิ่ม"
              mode="decimal"
              value={extra}
              onValueChange={setExtra}
              suffix="บาท/เดือน"
              hint="ทางเลือกที่ 2 และ 3 เท่านั้น สูงสุด 1,000 บาทต่อเดือน"
              error={error || undefined}
            />
          </div>

          {s40 && (
            <>
              <ResultBox label="จ่ายรวมเดือนละ">{formatBaht(s40.monthlyTotal)} บาท</ResultBox>
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="เงินสมทบตามทางเลือก" value={`${formatBaht(s40.option.contribution)} บาท`} />
                <Stat label="เงินออมเพิ่ม" value={`${formatBaht(s40.extraSaving)} บาท`} />
                <Stat label="รวมทั้งปี" value={`${formatBaht(s40.yearlyTotal)} บาท`} />
              </div>
              <DataTable
                caption="ความคุ้มครองของแต่ละทางเลือกในมาตรา 40"
                columns={[
                  { key: 'option', header: 'ทางเลือก', render: (o) => `ที่ ${o.option}` },
                  { key: 'contribution', header: 'บาท/เดือน', align: 'right', render: (o) => String(o.contribution) },
                  { key: 'coverage', header: 'ความคุ้มครอง', render: (o) => o.coverage },
                ]}
                rows={SECTION_40_OPTIONS}
                rowKey={(o) => String(o.option)}
              />
            </>
          )}
        </div>
      </TabPanel>
    </div>
  );
}
