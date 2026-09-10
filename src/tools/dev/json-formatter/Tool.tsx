import { useState } from 'react';
import { formatNumber } from '@/lib/format';
import { formatJson, minifyJson, type Indent, type JsonResult } from './logic';
import { Button, CopyButton, Select, Textarea } from '@/components/ui';

export default function JsonFormatterTool() {
  const [input, setInput] = useState('{"name":"ทูลสยาม","tools":[1,2,3]}');
  const [indent, setIndent] = useState<Indent>(2);
  const [result, setResult] = useState<JsonResult | null>(null);

  function run(fn: () => JsonResult) {
    setResult(fn());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run(() => formatJson(input, indent))}>จัดรูปแบบ</Button>
        <Button variant="secondary" onClick={() => run(() => minifyJson(input))}>
          ย่อ (minify)
        </Button>
        <Select
          wrapperClassName="inline-block"
          className="w-auto"
          value={String(indent)}
          onChange={(e) => setIndent(e.target.value === 'tab' ? 'tab' : (Number(e.target.value) as 2 | 4))}
          aria-label="ระยะเยื้อง"
        >
          <option value="2">เยื้อง 2 ช่อง</option>
          <option value="4">เยื้อง 4 ช่อง</option>
          <option value="tab">เยื้องด้วยแท็บ</option>
        </Select>
        <CopyButton text={result?.ok ? result.output : ''} label="คัดลอกผลลัพธ์" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          rows={16}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="JSON ต้นฉบับ"
          spellCheck={false}
        />
        <Textarea
          rows={16}
          readOnly
          value={result?.ok ? result.output : ''}
          aria-label="ผลลัพธ์"
          placeholder="ผลลัพธ์จะแสดงที่นี่"
        />
      </div>
      {result && !result.ok && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          ผิดพลาดที่บรรทัด {result.error.line} คอลัมน์ {result.error.column}: {result.error.message}
        </p>
      )}
      {result?.ok && (
        <p className="text-sm text-brand-700">✓ JSON ถูกต้อง ({formatNumber(result.output.length)} ตัวอักษร)</p>
      )}
    </div>
  );
}
