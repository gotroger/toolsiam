import { useState } from 'react';
import { CHANNEL_PRESETS, shopProfit } from './logic';
import { DataTable, Disclaimer, ErrorText, Field, NumberInput, ResultBox, Select, Stat } from '@/components/ui';
import { formatBaht, formatNumber } from '@/lib/format';

const num = (s: string) => {
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : Number.NaN;
};

export default function ShopProfitTool() {
  const [price, setPrice] = useState('500');
  const [cost, setCost] = useState('200');
  const [discount, setDiscount] = useState('50');
  const [shipping, setShipping] = useState('40');
  const [fee, setFee] = useState('8');
  const [ad, setAd] = useState('30');
  const [quantity, setQuantity] = useState('100');

  let error = '';
  let result: ReturnType<typeof shopProfit> | null = null;
  try {
    result = shopProfit({
      price: num(price), cost: num(cost), discount: num(discount), shipping: num(shipping),
      feePercent: num(fee), adCost: num(ad), quantity: num(quantity),
    });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberInput id="price" label="ราคาขายต่อชิ้น" mode="decimal" value={price} onValueChange={setPrice} suffix="บาท" />
        <NumberInput id="cost" label="ต้นทุนสินค้าต่อชิ้น" mode="decimal" value={cost} onValueChange={setCost} suffix="บาท" />
        <NumberInput id="discount" label="ส่วนลดที่ให้ลูกค้า" mode="decimal" value={discount} onValueChange={setDiscount} suffix="บาท/ชิ้น" />
        <NumberInput
          id="shipping"
          label="ค่าส่งที่ร้านออกเอง"
          mode="decimal"
          value={shipping}
          onValueChange={setShipping}
          suffix="บาท/ชิ้น"
          hint="ใส่ 0 ถ้าลูกค้าจ่ายค่าส่งเอง"
        />
        <Field label="ช่องทางขาย" htmlFor="channel">
          <Select
            id="channel"
            value={CHANNEL_PRESETS.find((c) => String(c.feePercent) === fee)?.id ?? 'custom'}
            onChange={(e) => {
              const preset = CHANNEL_PRESETS.find((c) => c.id === e.target.value);
              if (preset) setFee(String(preset.feePercent));
            }}
          >
            {CHANNEL_PRESETS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            <option value="custom">กำหนดเอง</option>
          </Select>
        </Field>
        <NumberInput
          id="fee"
          label="ค่าธรรมเนียมแพลตฟอร์ม"
          mode="decimal"
          value={fee}
          onValueChange={setFee}
          suffix="%"
          hint="คิดจากยอดที่ลูกค้าจ่ายหลังหักส่วนลดร้าน"
        />
        <NumberInput id="ad" label="ค่าโฆษณาเฉลี่ยต่อชิ้น" mode="decimal" value={ad} onValueChange={setAd} suffix="บาท" />
        <NumberInput id="quantity" label="จำนวนที่ขาย" mode="numeric" value={quantity} onValueChange={setQuantity} suffix="ชิ้น" />
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {result && (
        <>
          <ResultBox label="กำไรต่อชิ้น">
            {formatBaht(result.profitPerUnit)} บาท ({formatNumber(result.marginPercent, 2)}% ของยอดที่ลูกค้าจ่าย)
          </ResultBox>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="ลูกค้าจ่ายต่อชิ้น" value={`${formatBaht(result.netPrice)} บาท`} />
            <Stat label="ยอดขายรวม" value={`${formatBaht(result.totalRevenue)} บาท`} />
            <Stat label="ต้นทุนรวมทุกก้อน" value={`${formatBaht(result.totalCost)} บาท`} />
            <Stat label="กำไรรวม" value={`${formatBaht(result.totalProfit)} บาท`} />
          </div>

          <div>
            <h2 className="mb-2 text-base font-medium text-slate-900">เงินหายไปไหนบ้าง (ต่อชิ้น)</h2>
            <DataTable
              caption="รายละเอียดรายรับและค่าใช้จ่ายต่อสินค้าหนึ่งชิ้น"
              columns={[
                { key: 'item', header: 'รายการ', render: (r) => r.item },
                { key: 'amount', header: 'จำนวนเงิน', align: 'right', render: (r) => `${formatBaht(r.amount)} บาท` },
              ]}
              rows={[
                { item: 'ราคาขาย', amount: num(price) },
                { item: 'ส่วนลดที่ให้ลูกค้า', amount: -num(discount) },
                { item: 'ต้นทุนสินค้า', amount: -num(cost) },
                { item: 'ค่าส่งที่ร้านออกเอง', amount: -num(shipping) },
                { item: `ค่าธรรมเนียมแพลตฟอร์ม ${fee}%`, amount: -result.feeAmount },
                { item: 'ค่าโฆษณา', amount: -num(ad) },
                { item: 'เหลือเป็นกำไร', amount: result.profitPerUnit },
              ]}
              rowKey={(r) => r.item}
            />
          </div>

          {result.profitPerUnit <= 0 ? (
            <Disclaimer>
              ราคาและต้นทุนชุดนี้ทำให้ขาดทุน {formatBaht(Math.abs(result.profitPerUnit))} บาทต่อชิ้น
              ยิ่งขายยิ่งเสีย — ต้องขึ้นราคา ลดส่วนลด หรือลดค่าโฆษณาต่อชิ้นก่อน
            </Disclaimer>
          ) : (
            result.breakEvenUnits !== null && (
              <p className="text-sm text-slate-600">
                ค่าโฆษณาที่ลงไปคุ้มเมื่อขายได้ {result.breakEvenUnits.toLocaleString('en-US')} ชิ้นขึ้นไป
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
