import { useState, type CSSProperties } from 'react';
import {
  Button,
  CopyButton,
  cx,
  ErrorText,
  Field,
  NumberInput,
  SegmentedControl,
  Stat,
  Textarea,
} from '@/components/ui';
import type { Rng } from '@/lib/random';
import { parseList } from '../shared/list';
import { GROUP_ROLL_LIMIT } from '../shared/roll';
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

  function run() {
    const options = { mode, value: Number(value) };
    const split = (rng: Rng) => makeGroups(items, options, rng);
    // ค่าหลอกใช้พารามิเตอร์ชุดเดียวกับผลจริงที่ผ่านการตรวจแล้ว จึงไม่โยนข้อผิดพลาดกลางจังหวะ
    draw.draw(split, items.length <= GROUP_ROLL_LIMIT ? split : undefined);
  }

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
        <Button onClick={run} disabled={items.length === 0 || draw.rolling} aria-busy={draw.rolling}>
          {draw.rolling ? 'กำลังสลับ…' : 'แบ่งกลุ่ม'}
        </Button>
        <Stat label="จำนวนคนทั้งหมด" value={items.length} />
      </div>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.shown && (
        <div className="space-y-3" aria-live="polite">
          <div key={draw.drawId} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {draw.shown.map((group, i) => (
              <div
                key={i}
                className={cx(
                  'rounded-[10px] border border-slate-200 bg-surface p-3',
                  draw.rolling ? 'roll-live' : 'roll-in',
                )}
                style={{ '--roll-i': i } as CSSProperties}
              >
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
          {draw.result && <CopyButton text={asText(draw.result)} label="คัดลอกทุกกลุ่ม" />}
        </div>
      )}
    </div>
  );
}
