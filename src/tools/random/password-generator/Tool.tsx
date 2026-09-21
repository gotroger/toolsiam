import { useState } from 'react';
import { Alert, Button, Checkbox, CopyButton, Disclaimer, ErrorText, NumberInput, Stat } from '@/components/ui';
import { cryptoRng } from '@/lib/random';
import { DEFAULT_PASSWORD_OPTIONS, estimateStrength, generatePassword, poolSize, type PasswordOptions } from './logic';

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
 * ที่นี่จึงใช้ cryptoRng() ตรง ๆ และไม่นำเข้า SeedRow หรือ useDraw ของหมวดเลย
 * (มีเทสต์อ่านซอร์สไฟล์นี้คอยกันไว้ไม่ให้ใครเผลอเพิ่มกลับเข้ามา)
 */
export default function PasswordGeneratorTool() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  const [length, setLength] = useState(String(DEFAULT_PASSWORD_OPTIONS.length));
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current: PasswordOptions = { ...options, length: Number(length) };
  const size = poolSize(current);
  const strength = estimateStrength(current.length, size);

  function generate() {
    try {
      setPassword(generatePassword(current, cryptoRng()));
      setError(null);
    } catch (e) {
      setPassword('');
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

      <Button onClick={generate}>สร้างรหัสผ่าน</Button>

      {error && <ErrorText>{error}</ErrorText>}

      {password && (
        <div className="space-y-3">
          <div className="result-box border border-brand-600/20" aria-live="polite">
            <div className="text-xs font-medium text-brand-700">รหัสผ่านที่ได้</div>
            <div className="mt-1 break-all font-mono text-lg font-semibold">{password}</div>
          </div>
          <CopyButton text={password} label="คัดลอกรหัสผ่าน" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="ความแข็งแรง" value={strength.label} />
        <Stat label="ความยากในการเดา" value={`${strength.bits} บิต`} />
        <Stat label="อักขระที่เลือกได้" value={`${size} ตัว`} />
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
