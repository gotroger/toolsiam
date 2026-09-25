import { CopyButton, Field, Input } from '@/components/ui';

/**
 * ช่อง seed และ seed ที่ใช้จริง — หน้าตาและถ้อยคำต้องเหมือนกันทุกเครื่องมือในหมวด
 *
 * ถ้าปล่อยให้แต่ละเครื่องมือเขียนเอง เครื่องใดเครื่องหนึ่งจะลืมแสดง seed ที่ใช้
 * แล้วคำว่า "ตรวจสอบย้อนหลังได้" ของทั้งหมวดก็หมดความหมายโดยไม่มีใครรู้
 */
export function SeedRow({
  id,
  value,
  onChange,
  usedSeed,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  usedSeed: string | null;
}) {
  const seedId = `${id}-seed`;
  return (
    <div className="space-y-2">
      <Field
        label="seed สำหรับตรวจสอบย้อนหลัง (ไม่บังคับ)"
        htmlFor={seedId}
        hint="เว้นว่างไว้จะสุ่ม seed ใหม่ให้ทุกครั้ง · กรอก seed เดิมกลับมาแล้วได้ผลเดิมเป๊ะ"
      >
        <Input
          id={seedId}
          value={value}
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          placeholder="เช่น K7M2-QX4P-8HRT-D3WN"
          aria-describedby={`${seedId}-hint`}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      {usedSeed && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>
            seed ที่ใช้: <code className="font-mono font-semibold text-slate-900">{usedSeed}</code>
          </span>
          <CopyButton text={usedSeed} label="คัดลอก seed" />
        </p>
      )}
    </div>
  );
}
