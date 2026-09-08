import { useState } from 'react';
import { validateThaiId, randomThaiId, formatThaiId } from './logic';
import { Button, Field, Input, ResultBox } from '@/components/ui';

export default function ThaiIdCheckTool() {
  const [value, setValue] = useState('');
  const r = validateThaiId(value);
  const touched = value.trim() !== '';

  return (
    <div className="space-y-4">
      <Field label="เลขบัตรประชาชน" htmlFor="id" hint="ใส่ขีดหรือเว้นวรรคได้ ระบบตัดให้อัตโนมัติ">
        <Input
          id="id"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="1-2345-67890-12-1"
        />
      </Field>

      {touched && (
        <ResultBox label="ผลการตรวจสอบ">
          {r.valid ? (
            <span className="text-emerald-700">ถูกต้อง ✓ {r.formatted}</span>
          ) : (
            <span className="text-red-600">ไม่ถูกต้อง — {r.error}</span>
          )}
        </ResultBox>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setValue(formatThaiId(randomThaiId()))}>
          สุ่มเลขทดสอบ
        </Button>
        <Button variant="secondary" onClick={() => setValue('')}>
          ล้าง
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        ตรวจเฉพาะสูตรหลักตรวจสอบ ไม่ได้เชื่อมกับฐานข้อมูลทะเบียนราษฎร และเลขที่กรอกไม่ถูกส่งออกจากเบราว์เซอร์
      </p>
    </div>
  );
}
