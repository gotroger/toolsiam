import { useDateInput } from '@/lib/use-today';
import { numerologyFromDate } from '@/lib/thai-astro';
import { ErrorText, Field, Input, ResultBox, Stat } from '@/components/ui';

/** เลขศาสตร์วันเกิด — แสดงขั้นตอนการบวกให้ผู้ใช้ตรวจตามได้ ไม่ใช่ยิงผลลัพธ์ลอย ๆ */
export default function NumerologyFinder() {
  const [birth, setBirth] = useDateInput();

  let error = '';
  let result: ReturnType<typeof numerologyFromDate> | null = null;
  if (birth !== '') {
    try { result = numerologyFromDate(birth); } catch (e) { error = (e as Error).message; }
  }

  return (
    <div className="space-y-4">
      <Field label="วันเกิดของคุณ" htmlFor="nm-birth" hint="ระบบบวกเลขทุกหลักของวันเดือนปีเกิดจนเหลือหลักเดียว">
        <Input id="nm-birth" type="date" min="1900-01-01" max="2200-12-31" value={birth} onChange={(e) => setBirth(e.target.value)} aria-describedby="nm-birth-hint" />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="เลขชีวิตของคุณ">{result.lifePath}</ResultBox>

          <div>
            <h3 className="text-sm font-medium text-slate-700">ขั้นตอนการคำนวณ</h3>
            <ol className="mt-1 space-y-0.5 text-sm text-slate-600">
              {result.steps.map((s) => <li key={s} className="font-mono">{s}</li>)}
            </ol>
          </div>

          <p className="text-sm text-slate-700">{result.meaning}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="จุดแข็งตามความเชื่อ" value={result.strengths.join(' · ')} />
            <Stat label="สิ่งที่ควรระวัง" value={result.watchOut} />
          </div>
        </>
      )}
    </div>
  );
}
