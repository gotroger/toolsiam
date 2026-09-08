import { useState } from 'react';
import { fuelCost } from './logic';
import { Checkbox, ErrorText, NumberInput, ResultBox, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function FuelCostTool() {
  const [distance, setDistance] = useState('100');
  const [kmPerLitre, setKmPerLitre] = useState('15');
  const [price, setPrice] = useState('');
  const [tolls, setTolls] = useState('0');
  const [people, setPeople] = useState('1');
  const [roundTrip, setRoundTrip] = useState(false);

  // ราคาน้ำมันไม่มีค่าเริ่มต้นโดยตั้งใจ — ก่อนผู้ใช้กรอก การโชว์ผลลัพธ์ "0.00 บาท"
  // จะอ่านเหมือนคำตอบจริง ทั้งที่ยังไม่มีข้อมูลพอจะคำนวณ
  const hasPrice = price.trim() !== '';

  let error = '';
  let result: ReturnType<typeof fuelCost> | null = null;
  try {
    result = fuelCost({
      distanceKm: num(distance),
      kmPerLitre: num(kmPerLitre),
      pricePerLitre: num(price),
      roundTrip,
      people: num(people),
      tolls: num(tolls),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NumberInput id="distance" label="ระยะทางเที่ยวเดียว" mode="decimal" value={distance} onValueChange={setDistance} suffix="กม." />
        <NumberInput
          id="km-per-litre"
          label="อัตราสิ้นเปลืองของรถ"
          mode="decimal"
          value={kmPerLitre}
          onValueChange={setKmPerLitre}
          suffix="กม./ล."
          hint="ดูได้จากหน้าจอรถ หรือหารระยะทางที่วิ่งได้ด้วยจำนวนลิตรที่เติม"
        />
        <NumberInput
          id="price"
          label="ราคาน้ำมันต่อลิตร"
          mode="decimal"
          value={price}
          onValueChange={setPrice}
          suffix="บาท"
          hint="กรอกราคาจากป้ายหน้าปั๊มวันที่เดินทาง — เครื่องมือไม่ได้ดึงราคาปัจจุบันให้"
        />
        <NumberInput id="tolls" label="ค่าทางด่วน + ค่าจอดรถ" mode="decimal" value={tolls} onValueChange={setTolls} suffix="บาท" />
        <NumberInput id="people" label="หารกันกี่คน" mode="numeric" value={people} onValueChange={setPeople} suffix="คน" />
        <div className="flex items-end">
          <Checkbox label="คิดระยะทางไป-กลับ" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
        </div>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {!hasPrice && (
        <p className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          กรอกราคาน้ำมันต่อลิตรเพื่อดูค่าใช้จ่ายของทริปนี้
        </p>
      )}

      {result && hasPrice && (
        <>
          <ResultBox label="ค่าใช้จ่ายรวมทั้งทริป">{formatBaht(result.totalCost)} บาท</ResultBox>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ระยะทางรวม" value={`${formatNumber(result.totalDistanceKm, 0)} กม.`} />
            <Stat label="ใช้น้ำมัน" value={`${formatNumber(result.litresUsed, 2)} ลิตร`} />
            <Stat label="เฉพาะค่าน้ำมัน" value={`${formatBaht(result.fuelCost)} บาท`} />
            <Stat label="หารแล้วคนละ" value={`${formatBaht(result.costPerPerson)} บาท`} />
          </div>
          <p className="text-sm text-slate-600">เฉลี่ยกิโลเมตรละ {formatBaht(result.costPerKm)} บาท</p>
        </>
      )}
    </div>
  );
}
