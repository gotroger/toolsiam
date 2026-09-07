import { useState } from 'react';
import { countText } from './logic';
import { formatNumber } from '@/lib/format';
import { Field, Stat, Textarea } from '@/components/ui';

export default function WordCountTool() {
  const [text, setText] = useState('');
  const r = countText(text);

  return (
    <div className="space-y-4">
      <Field label="ข้อความ" htmlFor="text" hint="ประมวลผลในเบราว์เซอร์ ไม่มีการส่งข้อมูลออก">
        <Textarea id="text" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์หรือวางข้อความที่นี่…" autoFocus />
      </Field>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="คำ" value={formatNumber(r.words)} />
        <Stat label="ตัวอักษร (รวมช่องว่าง)" value={formatNumber(r.characters)} />
        <Stat label="ตัวอักษร (ไม่รวมช่องว่าง)" value={formatNumber(r.charactersNoSpaces)} />
        <Stat label="ตัวอักษรที่ตาเห็น" value={formatNumber(r.graphemes)} />
        <Stat label="บรรทัด" value={formatNumber(r.lines)} />
        <Stat label="ย่อหน้า" value={formatNumber(r.paragraphs)} />
        <Stat label="ประโยค" value={formatNumber(r.sentences)} />
        <Stat label="เวลาอ่านโดยประมาณ" value={`${formatNumber(r.readingMinutes)} นาที`} />
      </div>
    </div>
  );
}
