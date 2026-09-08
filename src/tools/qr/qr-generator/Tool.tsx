import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildQrPayload, type QrInput, type WifiEncryption } from './logic';
import { Checkbox, CopyButton, ErrorText, Field, Input, Select, Textarea } from '@/components/ui';

type Kind = QrInput['kind'];

export default function QrGeneratorTool() {
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('สวัสดี ToolSiam');
  const [url, setUrl] = useState('toolsiam.com');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [encryption, setEncryption] = useState<WifiEncryption>('WPA');
  const [hidden, setHidden] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  let payload = '';
  let payloadError = '';
  try {
    payload = buildQrPayload(
      kind === 'text'
        ? { kind, text }
        : kind === 'url'
          ? { kind, url }
          : kind === 'wifi'
            ? { kind, wifi: { ssid, password, encryption, hidden } }
            : { kind, vcard: { firstName, lastName, phone, email, org } },
    );
  } catch (e) {
    payloadError = (e as Error).message;
  }

  useEffect(() => {
    if (!payload) {
      setDataUrl('');
      setError('');
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(payload, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then((u) => {
        if (cancelled) return;
        setDataUrl(u);
        setError('');
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl('');
        setError('ข้อมูลยาวเกินกว่าที่ QR รองรับ กรุณาลดความยาวลง');
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="ประเภท QR" htmlFor="kind">
          <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="text">ข้อความ</option>
            <option value="url">ลิงก์เว็บไซต์</option>
            <option value="wifi">WiFi</option>
            <option value="vcard">นามบัตร (vCard)</option>
          </Select>
        </Field>

        {kind === 'text' && (
          <Field label="ข้อความ" htmlFor="text">
            <Textarea id="text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        )}

        {kind === 'url' && (
          <Field label="ลิงก์" htmlFor="url" hint="ไม่ต้องพิมพ์ https:// ก็ได้">
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}

        {kind === 'wifi' && (
          <>
            <Field label="ชื่อเครือข่าย (SSID)" htmlFor="ssid">
              <Input id="ssid" autoComplete="off" spellCheck={false} value={ssid} onChange={(e) => setSsid(e.target.value)} />
            </Field>
            <Field label="ระบบเข้ารหัส" htmlFor="enc">
              <Select id="enc" value={encryption} onChange={(e) => setEncryption(e.target.value as WifiEncryption)}>
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">ไม่มีรหัสผ่าน</option>
              </Select>
            </Field>
            {encryption !== 'nopass' && (
              <Field label="รหัสผ่าน" htmlFor="pw">
                <Input id="pw" autoComplete="off" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            )}
            <Checkbox label="เครือข่ายซ่อนชื่อ (hidden SSID)" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          </>
        )}

        {kind === 'vcard' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อ" htmlFor="fn">
              <Input id="fn" autoComplete="off" spellCheck={false} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="นามสกุล" htmlFor="ln">
              <Input id="ln" autoComplete="off" spellCheck={false} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
            <Field label="เบอร์โทร" htmlFor="tel">
              <Input id="tel" inputMode="tel" autoComplete="off" spellCheck={false} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="อีเมล" htmlFor="mail">
              <Input id="mail" inputMode="email" autoComplete="off" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="บริษัท/หน่วยงาน" htmlFor="org">
              <Input id="org" autoComplete="off" spellCheck={false} value={org} onChange={(e) => setOrg(e.target.value)} />
            </Field>
          </div>
        )}

        {(payloadError || error) && <ErrorText>{payloadError || error}</ErrorText>}
      </div>

      <div className="flex flex-col items-center gap-3">
        {dataUrl ? (
          <>
            {/* พื้นขาวจริงเสมอ ไม่ใช่ bg-surface ที่ตามธีม — QR บนพื้นเข้มสแกนไม่ติด */}
            <img
              src={dataUrl}
              alt="QR Code"
              width={320}
              height={320}
              className="rounded-lg border border-slate-200 bg-white"
            />
            <div className="flex flex-wrap justify-center gap-2">
              <a href={dataUrl} download={`toolsiam-qr-${kind}.png`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                ดาวน์โหลด PNG
              </a>
              <CopyButton text={payload} label="คัดลอกข้อมูลดิบ" />
            </div>
          </>
        ) : (
          <div className="flex h-80 w-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-400">
            กรอกข้อมูลทางซ้ายเพื่อสร้าง QR
          </div>
        )}
      </div>
    </div>
  );
}
