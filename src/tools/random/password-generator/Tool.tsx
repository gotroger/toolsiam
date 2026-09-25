import { useState, type CSSProperties } from 'react';
import { Alert, Button, Checkbox, CopyButton, Disclaimer, ErrorText, NumberInput, Stat } from '@/components/ui';
import { cryptoRng, randomInt } from '@/lib/random';
import { ResultAnnouncer } from '../shared/Announcer';
import { ROLL_STEPS, useRollSequence } from '../shared/roll';
import {
  activeSets,
  DEFAULT_PASSWORD_OPTIONS,
  estimateStrength,
  generatePassword,
  poolSize,
  type PasswordOptions,
} from './logic';

const TOGGLES: { key: keyof PasswordOptions; label: string }[] = [
  { key: 'lower', label: 'ตัวพิมพ์เล็ก a-z' },
  { key: 'upper', label: 'ตัวพิมพ์ใหญ่ A-Z' },
  { key: 'digits', label: 'ตัวเลข 0-9' },
  { key: 'symbols', label: 'สัญลักษณ์ !@#$' },
  { key: 'excludeLookAlike', label: 'ตัดตัวที่สับสน 0 O 1 l I' },
];

/**
 * เครื่องมือเดียวในหมวดที่ **ไม่มีโหมด seed**
 *
 * รหัสผ่านที่สร้างจาก seed ใครเห็น seed ก็สร้างซ้ำได้ จึงไม่ใช่ความลับอีกต่อไป
 * ที่นี่จึงใช้ cryptoRng() ตรง ๆ และไม่นำเข้าตัวจัดการ seed ของหมวดเลย
 * (มีเทสต์อ่านซอร์สไฟล์นี้คอยกันไว้ไม่ให้ใครเผลอเพิ่มกลับเข้ามา)
 */
export default function PasswordGeneratorTool() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [length, setLength] = useState(String(DEFAULT_PASSWORD_OPTIONS.length));
  const [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);
  const sequence = useRollSequence<string>();

  const current: PasswordOptions = { ...options, length: Number(length) };
  const size = poolSize(current);
  const strength = estimateStrength(current.length, size);
  const password = sequence.rolling ? null : sequence.shown;

  function generate() {
    try {
      const final = generatePassword(current, cryptoRng());
      setError(null);
      setRunId((n) => n + 1);

      // อักขระถูกล็อกทีละตัวจากซ้ายไปขวา ตัวที่ยังไม่ล็อกยังรัวอยู่
      const pool = activeSets(current).join('');
      const decoy = cryptoRng();
      sequence.play(final, (step) => {
        const locked = Math.floor((final.length * (step + 1)) / ROLL_STEPS.length);
        const rest = Array.from({ length: final.length - locked }, () => pool[randomInt(decoy, 0, pool.length - 1)]);
        return final.slice(0, locked) + rest.join('');
      });
    } catch (e) {
      sequence.clear();
      setError(e instanceof Error ? e.message : 'สร้างรหัสผ่านไม่สำเร็จ');
    }
  }

  return (
    <div className="space-y-5">
      <NumberInput
        id="length"
        label="ความยาวรหัสผ่าน"
        mode="numeric"
        value={length}
        onValueChange={setLength}
        suffix="ตัว"
        hint="16 ตัวขึ้นไปถือว่าแข็งแรงพอสำหรับบัญชีทั่วไป"
      />

      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-slate-700">ชุดอักขระที่ใช้</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {TOGGLES.map((toggle) => (
            <Checkbox
              key={toggle.key}
              label={toggle.label}
              checked={options[toggle.key] as boolean}
              onChange={(e) => setOptions({ ...options, [toggle.key]: e.target.checked })}
            />
          ))}
        </div>
      </fieldset>

      <Button onClick={generate} disabled={sequence.rolling} aria-busy={sequence.rolling}>
        {sequence.rolling ? 'กำลังสร้าง…' : 'สร้างรหัสผ่าน'}
      </Button>

      {error && <ErrorText>{error}</ErrorText>}
      {/* ประกาศแค่ว่าสร้างเสร็จ ไม่อ่านรหัสออกเสียง — คนข้าง ๆ อาจได้ยิน และผู้ใช้อ่านเองได้จากกล่องผล */}
      <ResultAnnouncer message={password ? `สร้างรหัสผ่านแล้ว ยาว ${password.length} ตัว` : ''} runId={runId} />

      {sequence.shown && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-busy={sequence.rolling}>
            <div key={runId} className={sequence.rolling ? undefined : 'roll-settle'}>
              <div className="text-xs font-medium text-brand-700">
                {sequence.rolling ? 'กำลังสร้าง…' : 'รหัสผ่านที่ได้'}
              </div>
              <div
                className="roll-figure mt-1 break-all font-mono text-lg font-semibold"
                style={{ color: 'var(--tile-accent)' } as CSSProperties}
              >
                {sequence.shown}
              </div>
            </div>
          </div>
          {password && <CopyButton text={password} label="คัดลอกรหัสผ่าน" />}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="ความแข็งแรง" value={strength.label} />
        <Stat label="ความยากในการเดา" value={<span className="roll-figure">{strength.bits} บิต</span>} />
        <Stat label="อักขระที่เลือกได้" value={<span className="roll-figure">{size} ตัว</span>} />
      </div>

      <Alert tone="note">
        รหัสผ่านถูกสร้างในเบราว์เซอร์ของคุณด้วยตัวสร้างเลขสุ่มของระบบ ไม่ถูกส่งออกไปที่ใด และไม่ถูกบันทึกไว้ —
        ปิดหน้านี้แล้วรหัสหายทันที ให้คัดลอกไปเก็บในโปรแกรมจัดการรหัสผ่านก่อน
      </Alert>

      <Disclaimer>
        ตัวเลข &quot;ความยากในการเดา&quot; เป็นการนับจำนวนความเป็นไปได้ของวิธีสร้างนี้เท่านั้น
        ไม่ได้ตรวจว่ารหัสนี้เคยหลุดจากเว็บที่ข้อมูลรั่วไหลหรือไม่
        และการใช้รหัสเดียวกันหลายเว็บยังอันตรายอยู่ดีแม้รหัสจะยาว
      </Disclaimer>
    </div>
  );
}
