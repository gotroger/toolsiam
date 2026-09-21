import { useState, type CSSProperties } from 'react';
import { Button, Checkbox, CopyButton, cx, ErrorText, NumberInput, SegmentedControl, Stat } from '@/components/ui';
import type { Rng } from '@/lib/random';
import { ROLL_LIMIT } from '../shared/roll';
import { SeedRow } from '../shared/SeedRow';
import { useDraw } from '../shared/useDraw';
import { Coin, Die } from './Dice';
import { drawNumbers, flipCoins, rollDice, type CoinSide, type NumberMode } from './logic';

const MODES = [
  { value: 'range', label: 'ช่วงตัวเลข' },
  { value: 'dice', label: 'ลูกเต๋า' },
  { value: 'coin', label: 'หัวก้อย' },
];

type Result =
  | { kind: 'numbers'; values: number[] }
  | { kind: 'dice'; rolls: number[]; total: number }
  | { kind: 'coin'; sides: CoinSide[] };

export default function RandomNumberTool() {
  const [mode, setMode] = useState<NumberMode>('range');
  const [min, setMin] = useState('1');
  const [max, setMax] = useState('100');
  const [count, setCount] = useState('1');
  const [unique, setUnique] = useState(true);
  const [diceCount, setDiceCount] = useState('2');
  const [sides, setSides] = useState('6');
  const [flips, setFlips] = useState('1');
  const draw = useDraw<Result>();

  function run() {
    const options = { min: Number(min), max: Number(max), count: Number(count), unique };
    const roll = (rng: Rng): Result => {
      if (mode === 'dice') return { kind: 'dice', ...rollDice(Number(diceCount), Number(sides), rng) };
      if (mode === 'coin') return { kind: 'coin', sides: flipCoins(Number(flips), rng) };
      return { kind: 'numbers', values: drawNumbers(options, rng) };
    };
    // ค่าหลอกใช้เงื่อนไขชุดเดียวกับผลจริง ซึ่งผ่านการตรวจมาแล้ว จึงไม่พังกลางจังหวะ
    const wanted = mode === 'dice' ? Number(diceCount) : mode === 'coin' ? Number(flips) : options.count;
    draw.draw(roll, wanted <= ROLL_LIMIT ? roll : undefined);
  }

  const shown = draw.shown;
  const accent = { color: 'var(--tile-accent)' } as CSSProperties;

  return (
    <div className="space-y-5">
      <SegmentedControl
        name="mode"
        legend="อยากสุ่มแบบไหน"
        value={mode}
        options={MODES}
        onChange={(value) => {
          setMode(value as NumberMode);
          draw.reset();
        }}
      />

      {mode === 'range' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberInput id="min" label="ค่าต่ำสุด" mode="numeric" value={min} onValueChange={setMin} />
            <NumberInput id="max" label="ค่าสูงสุด" mode="numeric" value={max} onValueChange={setMax} />
            <NumberInput
              id="count"
              label="สุ่มกี่ตัว"
              mode="numeric"
              value={count}
              onValueChange={setCount}
              suffix="ตัว"
            />
          </div>
          <Checkbox label="ห้ามได้เลขซ้ำกัน" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
        </div>
      )}

      {mode === 'dice' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="dice-count"
            label="ทอยกี่ลูก"
            mode="numeric"
            value={diceCount}
            onValueChange={setDiceCount}
            suffix="ลูก"
          />
          <NumberInput
            id="sides"
            label="ลูกเต๋ากี่หน้า"
            mode="numeric"
            value={sides}
            onValueChange={setSides}
            suffix="หน้า"
            hint="ลูกเต๋าทั่วไป 6 หน้า · บอร์ดเกมมักใช้ 20 หน้า"
          />
        </div>
      )}

      {mode === 'coin' && (
        <NumberInput
          id="flips"
          label="โยนกี่ครั้ง"
          mode="numeric"
          value={flips}
          onValueChange={setFlips}
          suffix="ครั้ง"
        />
      )}

      <SeedRow id="number" value={draw.seedInput} onChange={draw.setSeedInput} usedSeed={draw.usedSeed} />

      <Button onClick={run} disabled={draw.rolling} aria-busy={draw.rolling}>
        {draw.rolling
          ? mode === 'dice'
            ? 'กำลังทอย…'
            : mode === 'coin'
              ? 'กำลังโยน…'
              : 'กำลังสุ่ม…'
          : mode === 'dice'
            ? 'ทอยลูกเต๋า'
            : mode === 'coin'
              ? 'โยนเหรียญ'
              : 'สุ่มเลย'}
      </Button>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {shown?.kind === 'numbers' && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div key={draw.drawId} className={draw.rolling ? undefined : 'roll-settle'}>
              <div className="text-xs font-medium text-brand-700">
                {draw.rolling ? 'กำลังสุ่ม…' : shown.values.length === 1 ? 'ได้เลข' : `ได้ ${shown.values.length} เลข`}
              </div>
              <div
                className={cx(
                  'roll-figure mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-semibold',
                  shown.values.length === 1 ? 'text-5xl' : 'text-2xl',
                  draw.rolling && 'roll-live',
                )}
                style={accent}
              >
                {shown.values.map((value, i) => (
                  <span key={`${draw.drawId}-${i}`}>{value}</span>
                ))}
              </div>
            </div>
          </div>
          {draw.result?.kind === 'numbers' && <CopyButton text={draw.result.values.join(', ')} label="คัดลอกตัวเลข" />}
        </div>
      )}

      {shown?.kind === 'dice' && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div key={draw.drawId} className={draw.rolling ? undefined : 'roll-settle'}>
              <div className="text-xs font-medium text-brand-700">{draw.rolling ? 'กำลังทอย…' : 'ผลที่ทอยได้'}</div>
              <div className="mt-2 flex flex-wrap gap-3" style={accent}>
                {shown.rolls.map((value, i) => (
                  <span
                    key={`${draw.drawId}-${i}`}
                    className={draw.rolling ? undefined : 'roll-in'}
                    style={{ '--roll-i': i } as CSSProperties}
                  >
                    <Die value={value} rolling={draw.rolling} />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="ผลรวม" value={<span className="roll-figure">{shown.total}</span>} />
            <Stat label="จำนวนลูก" value={shown.rolls.length} />
          </div>
        </div>
      )}

      {shown?.kind === 'coin' && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div key={draw.drawId} className={draw.rolling ? undefined : 'roll-settle'}>
              <div className="text-xs font-medium text-brand-700">{draw.rolling ? 'กำลังโยน…' : 'ผลการโยน'}</div>
              <div className="mt-2 flex flex-wrap items-center gap-3" style={accent}>
                {shown.sides.slice(0, 24).map((side, i) => (
                  <span
                    key={`${draw.drawId}-${i}`}
                    className={draw.rolling ? undefined : 'roll-in'}
                    style={{ '--roll-i': i } as CSSProperties}
                  >
                    <Coin side={side} flipping={draw.rolling} />
                  </span>
                ))}
                {shown.sides.length > 24 && (
                  <span className="text-sm text-slate-600">และอีก {shown.sides.length - 24} ครั้ง</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat
              label="หัว"
              value={<span className="roll-figure">{shown.sides.filter((s) => s === 'หัว').length}</span>}
            />
            <Stat
              label="ก้อย"
              value={<span className="roll-figure">{shown.sides.filter((s) => s === 'ก้อย').length}</span>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
