import { useState } from 'react';
import {
  Alert, Button, Checkbox, CopyButton, DataTable, Disclaimer, EmptyState, ErrorText,
  Field, Input, NumberInput, ResultBox, Select, Stat, TabPanel, Tabs, Textarea,
} from '@/components/ui';

/**
 * ตัวอย่างการใช้งาน primitive ที่ต้องกดได้จริง — อยู่ในหน้า /design-system เท่านั้น
 *
 * ตั้งใจให้ทุกตัวมีสถานะครบทั้งปกติ / มี hint / มี error / ปิดใช้งาน
 * เพราะสถานะที่ไม่มีใครเปิดดูคือสถานะที่พังโดยไม่มีใครรู้
 */
const TABS = [
  { id: 'normal', label: 'สถานะปกติ' },
  { id: 'error', label: 'สถานะผิดพลาด' },
];

export default function DesignSystemDemo() {
  const [tab, setTab] = useState('normal');
  const [amount, setAmount] = useState('30000');
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(true);

  return (
    <div className="space-y-6">
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="สถานะของช่องกรอก" idPrefix="ds" />

      <TabPanel id="normal" idPrefix="ds" active={tab === 'normal'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="ds-salary" label="เงินเดือน" mode="decimal" value={amount}
            onValueChange={setAmount} suffix="บาท" hint="กรอกยอดก่อนหักภาษี"
          />
          <Field label="หมวดหมู่" htmlFor="ds-cat">
            <Select id="ds-cat" defaultValue="finance">
              <option value="finance">การเงิน ภาษี และเงินเดือน</option>
              <option value="loan">หนี้ สินเชื่อ และการผ่อน</option>
            </Select>
          </Field>
          <Field label="ชื่อร้าน" htmlFor="ds-shop" hint="ใช้แสดงบนใบเสร็จ">
            <Input id="ds-shop" placeholder="เช่น ร้านสยามพาณิชย์" />
          </Field>
          <Field label="ปิดใช้งาน" htmlFor="ds-disabled">
            <Input id="ds-disabled" disabled value="แก้ไขไม่ได้" readOnly />
          </Field>
        </div>
      </TabPanel>

      <TabPanel id="error" idPrefix="ds" active={tab === 'error'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="ds-bad" label="เงินเดือน" mode="decimal" value="abc"
            onValueChange={() => {}} suffix="บาท" error="ต้องเป็นตัวเลขเท่านั้น"
          />
          <div className="self-end"><ErrorText>ข้อความผิดพลาดแบบลอย ไม่ผูกกับช่องใด</ErrorText></div>
        </div>
      </TabPanel>

      <div className="space-y-3">
        <Field label="ข้อความหลายบรรทัด" htmlFor="ds-textarea">
          <Textarea id="ds-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "ok": true }' />
        </Field>
        <Checkbox label="ส่งประกันสังคม (มาตรา 33)" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Button>ปุ่มหลัก</Button>
        <Button variant="secondary">ปุ่มรอง</Button>
        <Button disabled>ปิดใช้งาน</Button>
        <CopyButton text="0812345678" />
        <CopyButton text="" label="ไม่มีอะไรให้คัดลอก" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ResultBox label="รับสุทธิ">28,500.00 บาท</ResultBox>
        <Stat label="ภาษีทั้งปี" value="12,000 บาท" />
        <Stat label="อายุงาน" value="3 ปี (1,095 วัน)" />
      </div>

      <div className="space-y-3">
        <Alert tone="note" title="กล่องแจ้งเชิงข้อมูล">ตัวเลขนี้เป็นการประมาณ ใช้ตรวจสอบเบื้องต้นเท่านั้น</Alert>
        <Alert tone="danger" title="กล่องแจ้งเมื่อมีอะไรพัง">ลองโหลดหน้าใหม่อีกครั้ง</Alert>
        <Disclaimer>เนื้อหาเป็นความเชื่อตามตำรา จัดทำเพื่อความบันเทิงเท่านั้น</Disclaimer>
      </div>

      <DataTable
        caption="ตัวอย่างตารางข้อมูล"
        rows={[
          { period: 1, payment: '11,355.78', balance: '1,997,810.89' },
          { period: 2, payment: '11,355.78', balance: '1,995,611.74' },
        ]}
        rowKey={(r) => String(r.period)}
        columns={[
          { key: 'period', header: 'งวด', render: (r) => r.period },
          { key: 'payment', header: 'ค่างวด', align: 'right', render: (r) => r.payment },
          { key: 'balance', header: 'คงเหลือ', align: 'right', render: (r) => r.balance },
        ]}
      />

      <EmptyState
        title="ไม่พบเครื่องมือที่ตรงกับที่ค้นหา"
        description="ลองใช้คำค้นอื่น หรือล้างตัวกรองเพื่อดูทั้งหมด"
        action={<Button>ล้างตัวกรอง</Button>}
      />
    </div>
  );
}
