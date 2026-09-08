// @vitest-environment jsdom
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { useState } from 'react';
import { Checkbox, Field, Input, NumberInput } from './form';
import { Button, CopyButton } from './button';
import { Alert, EmptyState, ResultBox, Stat } from './feedback';
import { DataTable } from './table';
import { TabPanel, Tabs } from './tabs';

/**
 * ด่าน a11y อัตโนมัติของชุด primitive
 *
 * axe ตรวจได้เฉพาะสิ่งที่อ่านจาก DOM — กฎที่ต้องใช้การเรนเดอร์จริงอย่าง color-contrast
 * ทำงานใน jsdom ไม่ได้ จึงปิดไว้ (คู่สีคุมด้วย token ใน global.css แทน)
 * เทสต์นี้ไม่ได้แทนการตรวจด้วยคน แต่กันไม่ให้ของที่ทำไว้ดีแล้วค่อย ๆ เสื่อม
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  const summary = results.violations.map((v) => `${v.id}: ${v.help}`).join('\n');
  expect(summary).toBe('');
}

function Form() {
  const [amount, setAmount] = useState('');
  const [sso, setSso] = useState(false);
  return (
    <main>
      <h1>คำนวณเงินเดือนสุทธิ</h1>
      <NumberInput
        id="salary" label="เงินเดือน" mode="decimal" value={amount} onValueChange={setAmount}
        hint="กรอกยอดก่อนหักภาษี" suffix="บาท"
      />
      <NumberInput
        id="bonus" label="โบนัส" mode="decimal" value="" onValueChange={() => {}}
        error="ต้องเป็นตัวเลข"
      />
      <Field label="ชื่อบริษัท" htmlFor="company"><Input id="company" /></Field>
      <Checkbox label="ส่งประกันสังคม" checked={sso} onChange={(e) => setSso(e.target.checked)} />
      <ResultBox label="รับสุทธิ">28,500.00 บาท</ResultBox>
      <Stat label="ภาษีทั้งปี" value="12,000 บาท" />
      <Button>คำนวณ</Button>
      <CopyButton text="28,500.00" />
      <Alert tone="note">ตัวเลขนี้เป็นการประมาณ</Alert>
    </main>
  );
}

function Table() {
  return (
    <main>
      <h1>ตาราง</h1>
      <DataTable
        caption="ตารางผ่อนชำระรายงวด"
        rows={[{ period: 1, payment: '11,355.78' }]}
        rowKey={(r) => String(r.period)}
        columns={[
          { key: 'period', header: 'งวด', render: (r) => r.period },
          { key: 'payment', header: 'ค่างวด', align: 'right', render: (r) => r.payment },
        ]}
      />
    </main>
  );
}

function TabbedTool() {
  const tabs = [{ id: 'a', label: 'แบบ ก' }, { id: 'b', label: 'แบบ ข' }];
  const [v, setV] = useState('a');
  return (
    <main>
      <h1>เครื่องมือ</h1>
      <Tabs tabs={tabs} value={v} onChange={setV} label="วิธีคำนวณ" idPrefix="t" />
      {tabs.map((t) => (
        <TabPanel key={t.id} id={t.id} idPrefix="t" active={v === t.id}>เนื้อหา {t.label}</TabPanel>
      ))}
    </main>
  );
}

describe('a11y ของชุด primitive (axe-core)', () => {
  it('ฟอร์มที่ประกอบจาก primitive ครบชุดผ่าน axe', async () => {
    const { container } = render(<Form />);
    await expectNoViolations(container);
  });

  it('ตารางข้อมูลผ่าน axe', async () => {
    const { container } = render(<Table />);
    await expectNoViolations(container);
  });

  it('ชุดแท็บผ่าน axe', async () => {
    const { container } = render(<TabbedTool />);
    await expectNoViolations(container);
  });

  /**
   * เทสต์ตรวจตัวเอง — ถ้า axe ถูกตั้งค่าผิดจนไม่ทำงาน เทสต์ข้างบนจะ "ผ่าน" หมด
   * โดยไม่ได้ตรวจอะไรเลย ข้อนี้จึงจงใจใส่ของที่ผิดเพื่อยืนยันว่าด่านยังมีชีวิต
   */
  it('ด่านนี้จับของจริง — ช่องกรอกที่ไม่มี label ต้องถูกจับได้', async () => {
    const { container } = render(<main><h1>ทดสอบ</h1><input type="text" /></main>);
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toContain('label');
  });

  it('สถานะว่างเปล่าผ่าน axe', async () => {
    const { container } = render(
      <main>
        <h1>เครื่องมือทั้งหมด</h1>
        <EmptyState title="ไม่พบเครื่องมือ" description="ลองคำค้นอื่น" action={<Button>ล้างตัวกรอง</Button>} />
      </main>,
    );
    await expectNoViolations(container);
  });
});
