/**
 * ค่าน้ำมันต่อทริป
 *
 * ราคาน้ำมันเปลี่ยนเกือบทุกสัปดาห์ เครื่องมือจึงให้ผู้ใช้กรอกราคาเอง
 * และตั้งใจไม่มีค่าเริ่มต้นที่อ้างว่าเป็นราคาปัจจุบัน (§10.2)
 */

export interface FuelInput {
  /** ระยะทางเที่ยวเดียว (กม.) */
  distanceKm: number;
  /** อัตราสิ้นเปลือง กม. ต่อลิตร */
  kmPerLitre: number;
  /** ราคาน้ำมันต่อลิตรที่ผู้ใช้กรอกเอง */
  pricePerLitre: number;
  /** ไป-กลับหรือไม่ */
  roundTrip: boolean;
  /** จำนวนคนที่หารค่าน้ำมัน */
  people: number;
  /** ค่าทางด่วนและค่าจอดรถรวมตลอดทริป */
  tolls: number;
}

export interface FuelResult {
  totalDistanceKm: number;
  litresUsed: number;
  fuelCost: number;
  /** ค่าน้ำมัน + ค่าทางด่วน */
  totalCost: number;
  costPerPerson: number;
  costPerKm: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function fuelCost(input: FuelInput): FuelResult {
  if (!Number.isFinite(input.distanceKm) || input.distanceKm < 0) throw new Error('ระยะทางต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(input.kmPerLitre) || input.kmPerLitre <= 0) throw new Error('อัตราสิ้นเปลืองต้องมากกว่า 0 กม./ลิตร');
  if (!Number.isFinite(input.pricePerLitre) || input.pricePerLitre < 0) throw new Error('ราคาน้ำมันต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(input.tolls) || input.tolls < 0) throw new Error('ค่าทางด่วนต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isInteger(input.people) || input.people < 1) throw new Error('จำนวนคนต้องเป็นจำนวนเต็มอย่างน้อย 1 คน');

  const totalDistanceKm = input.distanceKm * (input.roundTrip ? 2 : 1);
  const litresUsed = totalDistanceKm / input.kmPerLitre;
  const fuel = litresUsed * input.pricePerLitre;
  const total = fuel + input.tolls;

  return {
    totalDistanceKm: round2(totalDistanceKm),
    litresUsed: round2(litresUsed),
    fuelCost: round2(fuel),
    totalCost: round2(total),
    costPerPerson: round2(total / input.people),
    costPerKm: totalDistanceKm === 0 ? 0 : round2(total / totalDistanceKm),
  };
}
