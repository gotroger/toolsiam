import { useState } from 'react';
import { toThaiDigits, toArabicDigits, transformCase, type CaseMode } from './logic';
import { Button, Field, Textarea } from '@/components/ui';

type Action = 'thai' | 'arabic' | CaseMode;

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'thai', label: 'เป็นเลขไทย ๐-๙' },
  { id: 'arabic', label: 'เป็นเลขอารบิก 0-9' },
  { id: 'upper', label: 'ตัวพิมพ์ใหญ่' },
  { id: 'lower', label: 'ตัวพิมพ์เล็ก' },
  { id: 'title', label: 'ขึ้นต้นคำด้วยตัวใหญ่' },
  { id: 'sentence', label: 'ขึ้นต้นประโยคด้วยตัวใหญ่' },
];

function apply(text: string, action: Action): string {
  if (action === 'thai') return toThaiDigits(text);
  if (action === 'arabic') return toArabicDigits(text);
  return transformCase(text, action);
}

export default function ThaiNumeralsTool() {
  const [text, setText] = useState('ประกาศ ณ วันที่ 7 กันยายน 2569');
  const [action, setAction] = useState<Action>('thai');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const result = apply(text, action);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopyError('');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง');
    }
  }

  return (
    <div className="space-y-4">
      <Field label="ข้อความต้นฉบับ" htmlFor="src">
        <Textarea id="src" rows={6} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </Field>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button key={a.id} variant={a.id === action ? 'primary' : 'secondary'} onClick={() => setAction(a.id)}>
            {a.label}
          </Button>
        ))}
      </div>

      <Field label="ผลลัพธ์" htmlFor="out">
        <Textarea id="out" rows={6} value={result} readOnly />
      </Field>

      <Button onClick={copy} disabled={!result}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
      {copyError && <p className="text-sm text-red-600">{copyError}</p>}
    </div>
  );
}
