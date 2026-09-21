import { useState } from 'react';
import { Button, Checkbox, CopyButton, ErrorText, Field, NumberInput, Stat, Textarea } from '@/components/ui';
import { parseList } from '../shared/list';
import { SeedRow } from '../shared/SeedRow';
import { useDraw } from '../shared/useDraw';
import { pickWinners } from './logic';

export default function RandomPickerTool() {
  const [text, setText] = useState('');
  const [count, setCount] = useState('1');
  const [allowRepeat, setAllowRepeat] = useState(false);
  const draw = useDraw<string[]>();

  const items = parseList(text);
  const requested = Number(count);

  return (
    <div className="space-y-5">
      <Field
        label="รายชื่อหรือรายการ"
        htmlFor="entries"
        hint="บรรทัดละ 1 รายการ · พิมพ์ชื่อซ้ำได้ถ้าอยากให้มีสิทธิ์มากกว่าคนอื่น"
      >
        <Textarea
          id="entries"
          rows={8}
          value={text}
          aria-describedby="entries-hint"
          onChange={(e) => {
            setText(e.target.value);
            draw.reset();
          }}
          placeholder={'สมชาย\nสมหญิง\nวิชัย'}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          id="count"
          label="สุ่มกี่รายการ"
          mode="numeric"
          value={count}
          onValueChange={setCount}
          suffix="รายการ"
        />
        <div className="flex items-end pb-2">
          <Checkbox
            label="ให้รายการเดิมถูกเลือกซ้ำได้"
            checked={allowRepeat}
            onChange={(e) => setAllowRepeat(e.target.checked)}
          />
        </div>
      </div>

      <SeedRow id="picker" value={draw.seedInput} onChange={draw.setSeedInput} usedSeed={draw.usedSeed} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => draw.draw((rng) => pickWinners(items, { count: requested, allowRepeat }, rng))}
          disabled={items.length === 0}
        >
          สุ่มเลย
        </Button>
        <Stat label="รายการทั้งหมด" value={items.length} />
      </div>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.result && (
        <div className="result-box border border-brand-600/20" aria-live="polite">
          <div className="text-xs font-medium text-brand-700">
            {draw.result.length === 1 ? 'ผู้โชคดี' : `ผู้โชคดี ${draw.result.length} รายการ`}
          </div>
          <ol className="mt-2 space-y-1 text-lg font-semibold">
            {draw.result.map((name, i) => (
              <li key={`${name}-${i}`} className="flex gap-2">
                <span className="text-slate-400">{i + 1}.</span>
                <span className="break-words">{name}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3">
            <CopyButton text={draw.result.join('\n')} label="คัดลอกผลลัพธ์" />
          </div>
        </div>
      )}
    </div>
  );
}
