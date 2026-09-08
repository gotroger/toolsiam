import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPromptPayPayload, normalizeTarget } from './logic';
import { ErrorText, Field, Input } from '@/components/ui';

const TYPE_LABEL = { phone: 'เบอร์โทรศัพท์', nationalId: 'เลขบัตรประชาชน', ewallet: 'e-Wallet' } as const;

export default function PromptPayQrTool() {
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  let typeLabel = '';
  try {
    if (target.trim()) typeLabel = TYPE_LABEL[normalizeTarget(target).type];
  } catch {
    /* แสดง error ตอนสร้าง QR แทน */
  }

  useEffect(() => {
    if (!target.trim()) {
      setDataUrl('');
      setError('');
      return;
    }
    let cancelled = false;
    try {
      const amt = amount.trim() ? Number(amount.replace(/,/g, '')) : undefined;
      const payload = buildPromptPayPayload(target, amt);
      QRCode.toDataURL(payload, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
        .then((url) => {
          if (cancelled) return;
          setDataUrl(url);
          setError('');
        })
        .catch(() => {
          if (cancelled) return;
          setDataUrl('');
          setError('สร้าง QR ไม่สำเร็จ กรุณาลองใหม่');
        });
    } catch (e) {
      setError((e as Error).message);
      setDataUrl('');
    }
    return () => {
      cancelled = true;
    };
  }, [target, amount]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="เบอร์โทร / เลขบัตรประชาชน / e-Wallet" htmlFor="target" hint={typeLabel ? `ตรวจพบ: ${typeLabel}` : 'เช่น 0812345678'}>
          <Input id="target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} autoFocus />
        </Field>
        <Field label="จำนวนเงิน (บาท) — เว้นว่างให้ผู้โอนกรอกเอง" htmlFor="amount">
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="เช่น 150.00" />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
      <div className="flex flex-col items-center gap-3">
        {dataUrl ? (
          <>
            {/* พื้นขาวจริงเสมอ ไม่ใช่ bg-surface ที่ตามธีม — QR บนพื้นเข้มสแกนไม่ติด */}
            <img
              src={dataUrl}
              alt="QR PromptPay"
              width={320}
              height={320}
              className="rounded-lg border border-slate-200 bg-white"
            />
            <a href={dataUrl} download={`promptpay-${target.replace(/\D/g, '')}.png`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              ดาวน์โหลดรูป QR
            </a>
          </>
        ) : (
          <div className="flex h-80 w-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
            QR จะแสดงที่นี่
          </div>
        )}
      </div>
    </div>
  );
}
