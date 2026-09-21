import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Button, Checkbox, ErrorText, Field, ResultBox, Stat, Textarea } from '@/components/ui';
import { parseList } from '../shared/list';
import { SeedRow } from '../shared/SeedRow';
import { resolveDraw } from '@/lib/random';
import { LABEL_LIMIT, planSpin, WHEEL_MAX, WHEEL_MIN, WHEEL_RADIUS, wheelSegments } from './logic';

/** ระยะเวลาแอนิเมชัน ต้องตรงกับ .spin-wheel-dial ใน product.css */
const SPIN_MS = 3200;

/** สีช่องวนตามชุดสีหมวดที่มีอยู่แล้ว — ไม่สร้างจานสีใหม่ให้ต้องดูแลอีกชุด */
const SEGMENT_COLORS = [
  'var(--color-accent-magenta)',
  'var(--color-accent-cyan)',
  'var(--color-accent-orange)',
  'var(--color-accent-indigo)',
  'var(--color-accent-lime)',
  'var(--color-accent-rose)',
  'var(--color-accent-teal)',
  'var(--color-accent-gold)',
];

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

export default function SpinWheelTool() {
  const [text, setText] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [usedSeed, setUsedSeed] = useState<string | null>(null);
  const [removed, setRemoved] = useState<number[]>([]);
  const [removeAfterSpin, setRemoveAfterSpin] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => () => window.clearTimeout(timer.current ?? undefined), []);

  const all = parseList(text);
  const pool = all.filter((_, i) => !removed.includes(i));
  const poolIndexes = all.map((_, i) => i).filter((i) => !removed.includes(i));
  const tooMany = pool.length > WHEEL_MAX;
  const segments = pool.length > 0 ? wheelSegments(pool.slice(0, WHEEL_MAX)) : [];
  const fontSize = Math.max(4.5, 10 - segments.length * 0.28);

  function resetAll(next: string) {
    window.clearTimeout(timer.current ?? undefined);
    setText(next);
    setRemoved([]);
    setWinner(null);
    setError(null);
    setSpinning(false);
  }

  function reveal(index: number) {
    setSpinning(false);
    setWinner(pool[index]);
    if (removeAfterSpin) setRemoved((prev) => [...prev, poolIndexes[index]]);
  }

  function spin() {
    if (spinning) return;
    try {
      const { rng, seed } = resolveDraw(seedInput);
      // ตัดสินผู้ชนะที่บรรทัดนี้ ก่อนแอนิเมชันเริ่ม — ไม่เคยอ่านผลจากมุมที่วงล้อหยุดจริง
      const plan = planSpin(pool.length, rotation, rng);
      setUsedSeed(seed);
      setError(null);
      setWinner(null);
      setRotation(plan.rotation);

      if (reduced) {
        reveal(plan.index);
        return;
      }
      setSpinning(true);
      timer.current = window.setTimeout(() => reveal(plan.index), SPIN_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'หมุนไม่สำเร็จ');
    }
  }

  return (
    <div className="space-y-5">
      <Field
        label="รายการในวงล้อ"
        htmlFor="wheel-entries"
        hint={`บรรทัดละ 1 รายการ · รองรับ ${WHEEL_MIN}–${WHEEL_MAX} รายการ`}
      >
        <Textarea
          id="wheel-entries"
          rows={6}
          value={text}
          aria-describedby="wheel-entries-hint"
          onChange={(e) => resetAll(e.target.value)}
          placeholder={'ข้าวมันไก่\nก๋วยเตี๋ยว\nส้มตำ\nข้าวผัด'}
        />
      </Field>

      {tooMany && (
        <Alert tone="note">
          มี {pool.length} รายการ วงล้อจึงแสดงเฉพาะ {WHEEL_MAX} รายการแรก เพราะมากกว่านี้ป้ายชื่ออ่านไม่ออก
          ถ้าต้องการสุ่มจากรายการยาว ๆ ให้ใช้เครื่องมือสุ่มชื่อ จับฉลาก แทน
        </Alert>
      )}

      <div className="flex justify-center">
        <div className="relative w-full max-w-sm">
          {/* เข็มชี้อยู่นอกกลุ่มที่หมุน จึงอยู่กับที่ตลอด */}
          <svg
            viewBox="-110 -118 220 228"
            className="w-full"
            role="img"
            aria-label={`วงล้อสุ่ม ${segments.length} ช่อง`}
          >
            <path d="M0 -104 -8 -116h16Z" fill="var(--color-slate-700, #334155)" />
            <g
              className="spin-wheel-dial"
              data-instant={reduced ? 'true' : undefined}
              style={{ transform: `rotate(${rotation}deg)` }}
              aria-hidden="true"
            >
              <circle r={WHEEL_RADIUS} fill="var(--color-slate-200, #e2e8f0)" />
              {segments.map((segment) => {
                const flip = segment.midAngle > 180;
                return (
                  <g key={segment.index}>
                    <path
                      d={segment.path}
                      fill={SEGMENT_COLORS[segment.index % SEGMENT_COLORS.length]}
                      stroke="#fff"
                      strokeWidth="0.75"
                    />
                    <text
                      transform={`rotate(${segment.midAngle - 90}) translate(${WHEEL_RADIUS * 0.58} 0)${flip ? ' rotate(180)' : ''}`}
                      textAnchor={flip ? 'start' : 'end'}
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fill="#fff"
                      fontWeight="600"
                    >
                      {segments.length > LABEL_LIMIT
                        ? segment.index + 1
                        : segment.label.length > 14
                          ? `${segment.label.slice(0, 13)}…`
                          : segment.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      <SeedRow id="wheel" value={seedInput} onChange={setSeedInput} usedSeed={usedSeed} />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={spin} disabled={spinning || pool.length < WHEEL_MIN} aria-busy={spinning}>
          {spinning ? 'กำลังหมุน…' : 'หมุนวงล้อ'}
        </Button>
        <Checkbox
          label="ลบรายการที่ออกแล้วออกจากวงล้อ"
          checked={removeAfterSpin}
          onChange={(e) => setRemoveAfterSpin(e.target.checked)}
        />
        <Stat label="เหลือในวงล้อ" value={pool.length} />
        {removed.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              setRemoved([]);
              setWinner(null);
            }}
          >
            คืนรายการทั้งหมด
          </Button>
        )}
      </div>

      <p role="status" className="sr-only">
        {spinning ? 'กำลังหมุนวงล้อ' : ''}
      </p>

      {pool.length > 0 && pool.length < WHEEL_MIN && (
        <ErrorText>ต้องมีอย่างน้อย {WHEEL_MIN} รายการจึงจะหมุนได้</ErrorText>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {winner && <ResultBox label="ผลการหมุน">{winner}</ResultBox>}
    </div>
  );
}
