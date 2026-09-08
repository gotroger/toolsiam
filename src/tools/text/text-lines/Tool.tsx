import { useState } from 'react';
import { processLines, DEFAULT_LINE_OPTIONS, type LineOptions } from './logic';
import { Checkbox, CopyButton, Field, Select, Stat, Textarea } from '@/components/ui';

const TOGGLES: { key: keyof LineOptions; label: string }[] = [
  { key: 'trim', label: 'ตัดช่องว่างหัวท้าย' },
  { key: 'removeEmpty', label: 'ลบบรรทัดว่าง' },
  { key: 'unique', label: 'ลบบรรทัดซ้ำ' },
  { key: 'caseInsensitive', label: 'ไม่สนตัวพิมพ์ใหญ่-เล็ก' },
  { key: 'reverse', label: 'กลับลำดับ' },
  { key: 'addNumbers', label: 'ใส่เลขลำดับ' },
];

export default function TextLinesTool() {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<LineOptions>(DEFAULT_LINE_OPTIONS);
  const result = processLines(text, options);

  return (
    <div className="space-y-4">
      <Field label="ข้อความต้นฉบับ" htmlFor="src" hint="บรรทัดละ 1 รายการ">
        <Textarea
          id="src"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="วางรายการที่นี่…"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLES.map((t) => (
            <Checkbox
              key={t.key}
              label={t.label}
              checked={options[t.key] as boolean}
              onChange={(e) => setOptions({ ...options, [t.key]: e.target.checked })}
            />
          ))}
        </div>
        <div className="w-48">
          <Field label="เรียงลำดับ" htmlFor="sort">
            <Select
              id="sort"
              value={options.sort}
              onChange={(e) => setOptions({ ...options, sort: e.target.value as LineOptions['sort'] })}
            >
              <option value="none">ไม่เรียง</option>
              <option value="asc">ก-ฮ / A-Z</option>
              <option value="desc">ฮ-ก / Z-A</option>
            </Select>
          </Field>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="บรรทัดเข้า" value={result.stats.input} />
        <Stat label="บรรทัดออก" value={result.stats.output} />
        <Stat label="ลบออก" value={result.stats.removed} />
      </div>

      <Field label="ผลลัพธ์" htmlFor="out">
        <Textarea id="out" rows={8} value={result.text} readOnly />
      </Field>

      <CopyButton text={result.text} />
    </div>
  );
}
