import { useState } from 'react';
import { processLines, DEFAULT_LINE_OPTIONS, type LineOptions } from './logic';
import { Button, Field, Select, Stat, Textarea } from '@/components/ui';

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
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const result = processLines(text, options);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  return (
    <div className="space-y-4">
      <Field label="ข้อความต้นฉบับ" htmlFor="src" hint="บรรทัดละ 1 รายการ">
        <Textarea id="src" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="วางรายการที่นี่…" autoFocus />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={options[t.key] as boolean}
                onChange={(e) => setOptions({ ...options, [t.key]: e.target.checked })}
              />
              {t.label}
            </label>
          ))}
        </div>
        <div className="w-48">
          <Field label="เรียงลำดับ" htmlFor="sort">
            <Select id="sort" value={options.sort} onChange={(e) => setOptions({ ...options, sort: e.target.value as LineOptions['sort'] })}>
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

      <Button onClick={copy} disabled={!result.text}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
      {copyError && <p className="text-sm text-red-600">{copyError}</p>}
    </div>
  );
}
