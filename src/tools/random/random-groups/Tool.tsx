import { useState } from 'react';
import { Button, CopyButton, ErrorText, Field, NumberInput, SegmentedControl, Stat, Textarea } from '@/components/ui';
import { parseList } from '../shared/list';
import { SeedRow } from '../shared/SeedRow';
import { useDraw } from '../shared/useDraw';
import { makeGroups, type GroupMode } from './logic';

const MODES = [
  { value: 'byCount', label: 'กำหนดจำนวนกลุ่ม' },
  { value: 'bySize', label: 'กำหนดคนต่อกลุ่ม' },
];

export default function RandomGroupsTool() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<GroupMode>('byCount');
  const [value, setValue] = useState('3');
  const draw = useDraw<string[][]>();

  const items = parseList(text);
  const asText = (groups: string[][]) =>
    groups.map((group, i) => `กลุ่มที่ ${i + 1}\n${group.map((name) => `- ${name}`).join('\n')}`).join('\n\n');

  return (
    <div className="space-y-5">
      <Field label="รายชื่อ" htmlFor="names" hint="บรรทัดละ 1 คน">
        <Textarea
          id="names"
          rows={8}
          value={text}
          aria-describedby="names-hint"
          onChange={(e) => {
            setText(e.target.value);
            draw.reset();
          }}
          placeholder={'สมชาย\nสมหญิง\nวิชัย\nมานี'}
        />
      </Field>

      <SegmentedControl
        name="group-mode"
        legend="แบ่งแบบไหน"
        value={mode}
        options={MODES}
        onChange={(next) => {
          setMode(next as GroupMode);
          draw.reset();
        }}
      />

      <NumberInput
        id="value"
        label={mode === 'byCount' ? 'จำนวนกลุ่ม' : 'จำนวนคนต่อกลุ่ม'}
        mode="numeric"
        value={value}
        onValueChange={setValue}
        suffix={mode === 'byCount' ? 'กลุ่ม' : 'คน'}
        hint={
          mode === 'byCount' ? 'เศษที่เหลือจะถูกแจกให้กลุ่มแรก ๆ กลุ่มละคน' : 'กลุ่มสุดท้ายอาจมีคนน้อยกว่ากลุ่มอื่น'
        }
      />

      <SeedRow id="groups" value={draw.seedInput} onChange={draw.setSeedInput} usedSeed={draw.usedSeed} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => draw.draw((rng) => makeGroups(items, { mode, value: Number(value) }, rng))}
          disabled={items.length === 0}
        >
          แบ่งกลุ่ม
        </Button>
        <Stat label="จำนวนคนทั้งหมด" value={items.length} />
      </div>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.result && (
        <div className="space-y-3" aria-live="polite">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draw.result.map((group, i) => (
              <div key={i} className="rounded-[10px] border border-slate-200 bg-surface p-3">
                <div className="text-xs font-medium text-brand-700">
                  กลุ่มที่ {i + 1} · {group.length} คน
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {group.map((name, j) => (
                    <li key={`${name}-${j}`} className="break-words">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <CopyButton text={asText(draw.result)} label="คัดลอกทุกกลุ่ม" />
        </div>
      )}
    </div>
  );
}
