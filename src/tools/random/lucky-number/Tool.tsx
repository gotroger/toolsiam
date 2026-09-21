import { useState } from 'react';
import { Button, CopyButton, Disclaimer, ErrorText, NumberInput, SegmentedControl } from '@/components/ui';
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

      <Button onClick={() => draw.draw((rng) => drawLuckyNumbers(digits, Number(count), rng))}>สุ่มเลข</Button>

      {draw.error && <ErrorText>{draw.error}</ErrorText>}

      {draw.result && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div className="text-xs font-medium text-brand-700">เลขที่สุ่มได้</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {draw.result.map((number) => (
                <span
                  key={number}
                  className="rounded-full bg-brand-50 px-4 py-1.5 font-mono text-lg font-semibold text-brand-700"
                >
                  {number}
                </span>
              ))}
            </div>
          </div>
          <CopyButton text={draw.result.join(' ')} label="คัดลอกเลข" />
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
