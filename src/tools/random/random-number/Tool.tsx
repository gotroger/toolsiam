import { useState } from 'react';
import {
  Button,
  Checkbox,
  CopyButton,
  ErrorText,
  NumberInput,
  ResultBox,
  SegmentedControl,
  Stat,
} from '@/components/ui';
import { SeedRow } from '../shared/SeedRow';
import { useDraw } from '../shared/useDraw';
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
    draw.draw((rng): Result => {
      if (mode === 'dice') return { kind: 'dice', ...rollDice(Number(diceCount), Number(sides), rng) };
      if (mode === 'coin') return { kind: 'coin', sides: flipCoins(Number(flips), rng) };
      return {
        kind: 'numbers',
        values: drawNumbers({ min: Number(min), max: Number(max), count: Number(count), unique }, rng),
      };
    });
  }

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

      <Button onClick={run}>{mode === 'dice' ? 'ทอยลูกเต๋า' : mode === 'coin' ? 'โยนเหรียญ' : 'สุ่มเลย'}</Button>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.result?.kind === 'numbers' && (
        <div className="space-y-3">
          <ResultBox label={draw.result.values.length === 1 ? 'ได้เลข' : `ได้ ${draw.result.values.length} เลข`}>
            {draw.result.values.join(', ')}
          </ResultBox>
          <CopyButton text={draw.result.values.join(', ')} label="คัดลอกตัวเลข" />
        </div>
      )}

      {draw.result?.kind === 'dice' && (
        <div className="space-y-3">
          <ResultBox label="ผลที่ทอยได้">{draw.result.rolls.join(' · ')}</ResultBox>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="ผลรวม" value={draw.result.total} />
            <Stat label="จำนวนลูก" value={draw.result.rolls.length} />
          </div>
        </div>
      )}

      {draw.result?.kind === 'coin' && (
        <div className="space-y-3">
          <ResultBox label="ผลการโยน">{draw.result.sides.join(' · ')}</ResultBox>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="หัว" value={draw.result.sides.filter((s) => s === 'หัว').length} />
            <Stat label="ก้อย" value={draw.result.sides.filter((s) => s === 'ก้อย').length} />
          </div>
        </div>
      )}
    </div>
  );
}
