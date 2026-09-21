import { useState, type CSSProperties } from 'react';
import { Button, CopyButton, cx, Disclaimer, ErrorText, NumberInput, SegmentedControl } from '@/components/ui';
import { ROLL_STEPS } from '../shared/roll';
import { SeedRow } from '../shared/SeedRow';
import { useDraw } from '../shared/useDraw';
import { drawLuckyNumbers, type LuckyDigits } from './logic';

const DIGIT_OPTIONS = [
  { value: '2', label: 'เลข 2 ตัว' },
  { value: '3', label: 'เลข 3 ตัว' },
];

export default function LuckyNumberTool() {
  const [digits, setDigits] = useState<LuckyDigits>(2);
  const [count, setCount] = useState('3');
  const draw = useDraw<string[]>();

  function run() {
    draw.draw(
      (rng) => drawLuckyNumbers(digits, Number(count), rng),
      // ล็อกทีละลูกจากซ้ายไปขวา ลูกที่ยังไม่ล็อกยังวิ่งอยู่ — เหมือนเครื่องหมุนที่ปล่อยลูกทีละลูก
      (rng, step, final) => {
        const locked = Math.floor((final.length * (step + 1)) / ROLL_STEPS.length);
        const decoy = drawLuckyNumbers(digits, final.length, rng);
        return final.map((value, i) => (i < locked ? value : decoy[i]));
      },
    );
  }

  return (
    <div className="space-y-5">
      <SegmentedControl
        name="digits"
        legend="อยากได้เลขกี่ตัว"
        value={String(digits)}
        options={DIGIT_OPTIONS}
        onChange={(value) => {
          setDigits(Number(value) as LuckyDigits);
          draw.reset();
        }}
      />

      <NumberInput
        id="count"
        label="สุ่มกี่ชุด"
        mode="numeric"
        value={count}
        onValueChange={setCount}
        suffix="ชุด"
        hint="แต่ละชุดในการสุ่มครั้งเดียวกันจะไม่ซ้ำกัน"
      />

      <SeedRow id="lucky" value={draw.seedInput} onChange={draw.setSeedInput} usedSeed={draw.usedSeed} />

      <Button onClick={run} disabled={draw.rolling} aria-busy={draw.rolling}>
        {draw.rolling ? 'กำลังสุ่ม…' : 'สุ่มเลข'}
      </Button>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.shown && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div key={draw.drawId} className={draw.rolling ? undefined : 'roll-settle'}>
              <div className="text-xs font-medium text-brand-700">{draw.rolling ? 'กำลังสุ่ม…' : 'เลขที่สุ่มได้'}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {draw.shown.map((number, i) => (
                  <span
                    key={`${draw.drawId}-${i}`}
                    className={cx(
                      'roll-figure flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold',
                      !draw.rolling && 'roll-in',
                    )}
                    style={
                      {
                        '--roll-i': i,
                        color: 'var(--tile-accent)',
                        background: 'color-mix(in srgb, var(--tile-accent) 13%, var(--color-surface))',
                        border: '1px solid color-mix(in srgb, var(--tile-accent) 26%, transparent)',
                      } as CSSProperties
                    }
                  >
                    {number}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {draw.result && <CopyButton text={draw.result.join(' ')} label="คัดลอกเลข" />}
        </div>
      )}

      <Disclaimer>
        เลขทุกชุดมาจากการสุ่มแบบสม่ำเสมอ ทุกเลขมีโอกาสออกเท่ากันและไม่ขึ้นกับผลครั้งก่อน
        เครื่องมือนี้ทำขึ้นเพื่อความบันเทิงตามความเชื่อ ไม่ใช่การทำนาย ไม่มีวิธีใดทำให้เดาผลรางวัลได้แม่นขึ้น
        และการเสี่ยงโชคมีความเสี่ยงที่จะสูญเงินเสมอ
      </Disclaimer>
    </div>
  );
}
