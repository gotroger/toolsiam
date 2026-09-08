import { useState } from 'react';
import { bahtText } from './logic';
import { CopyButton, ErrorText, Field, Input, ResultBox } from '@/components/ui';

export default function BahtTextTool() {
  const [value, setValue] = useState('1,234.50');
  let result = '';
  let error = '';
  if (value.trim()) {
    try {
      result = bahtText(value);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-4">
      <Field label="จำนวนเงิน (บาท)" htmlFor="amount" hint="ใส่คอมมาหรือทศนิยมได้ เช่น 1,234.50">
        <Input id="amount" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <ResultBox label="คำอ่านภาษาไทย">{result || '—'}</ResultBox>
      <CopyButton text={result} />
    </div>
  );
}
