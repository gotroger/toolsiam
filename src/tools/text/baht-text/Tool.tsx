import { useState } from 'react';
import { bahtText } from './logic';
import { Button, Field, Input, ResultBox } from '@/components/ui';

export default function BahtTextTool() {
  const [value, setValue] = useState('1,234.50');
  const [copied, setCopied] = useState(false);

  let result = '';
  let error = '';
  if (value.trim()) {
    try {
      result = bahtText(value);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <Field label="จำนวนเงิน (บาท)" htmlFor="amount" hint="ใส่คอมมาหรือทศนิยมได้ เช่น 1,234.50">
        <Input id="amount" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ResultBox label="คำอ่านภาษาไทย">{result || '—'}</ResultBox>
      <Button onClick={copy} disabled={!result}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
    </div>
  );
}
