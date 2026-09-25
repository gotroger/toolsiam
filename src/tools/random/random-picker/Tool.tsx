import { useState, type CSSProperties } from 'react';
import { Button, Checkbox, CopyButton, cx, ErrorText, Field, NumberInput, Stat, Textarea } from '@/components/ui';
import type { Rng } from '@/lib/random';
import { parseList } from '../shared/list';
import { ROLL_LIMIT } from '../shared/roll';
import { ResultAnnouncer } from '../shared/Announcer';
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

  function run() {
    const options = { count: requested, allowRepeat };
    const pick = (rng: Rng) => pickWinners(items, options, rng);
    // ค่าหลอกใช้เงื่อนไขชุดเดียวกับผลจริง จึงไม่โผล่ชื่อซ้ำทั้งที่ผู้ใช้สั่งห้ามซ้ำ
    // และไม่มีทางโยนข้อผิดพลาดกลางจังหวะ เพราะผลจริงคำนวณผ่านมาก่อนแล้วด้วยเงื่อนไขเดียวกัน
    draw.draw(pick, requested <= ROLL_LIMIT ? pick : undefined);
  }

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
        <Button onClick={run} disabled={items.length === 0 || draw.rolling} aria-busy={draw.rolling}>
          {draw.rolling ? 'กำลังสุ่ม…' : 'สุ่มเลย'}
        </Button>
        <Stat label="รายการทั้งหมด" value={items.length} />
      </div>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}
      <ResultAnnouncer
        message={draw.result ? `ผู้โชคดี ${draw.result.map((name, i) => `${i + 1}. ${name}`).join(' ')}` : ''}
        runId={draw.drawId}
      />

      {draw.shown && (
        <div className="result-box border border-brand-600/20" aria-busy={draw.rolling}>
          <div key={draw.drawId} className={draw.rolling ? undefined : 'roll-settle'}>
            <div className="text-xs font-medium text-brand-700">
              {draw.rolling
                ? 'กำลังสุ่ม…'
                : draw.shown.length === 1
                  ? 'ผู้โชคดี'
                  : `ผู้โชคดี ${draw.shown.length} รายการ`}
            </div>
            <ol className={cx('mt-2 space-y-1 text-lg font-semibold', draw.rolling && 'roll-live')}>
              {draw.shown.map((name, i) => (
                <li
                  key={`${draw.drawId}-${i}`}
                  className={cx('flex gap-2', !draw.rolling && 'roll-in')}
                  style={{ '--roll-i': i } as CSSProperties}
                >
                  <span className="text-slate-400">{i + 1}.</span>
                  <span className="break-words">{name}</span>
                </li>
              ))}
            </ol>
          </div>
          {draw.result && (
            <div className="mt-3">
              <CopyButton text={draw.result.join('\n')} label="คัดลอกผลลัพธ์" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
