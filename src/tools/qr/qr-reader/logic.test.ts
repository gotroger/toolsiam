import { describe, it, expect } from 'vitest';
import { classifyQrText } from './logic';
import { buildVCardPayload, buildWifiPayload } from '@/tools/qr/qr-generator/logic';

describe('classifyQrText', () => {
  it('ลิงก์เว็บ', () => {
    const r = classifyQrText('https://toolsiam.com/t/qr-reader');
    expect(r.kind).toBe('url');
    expect(r.label).toBe('ลิงก์เว็บไซต์');
    expect(r.fields).toEqual([{ label: 'ลิงก์', value: 'https://toolsiam.com/t/qr-reader' }]);
  });

  it('WiFi พร้อม unescape อักขระพิเศษ', () => {
    const r = classifyQrText('WIFI:T:WPA;S:Cafe\\;1;P:a\\:b;H:true;;');
    expect(r.kind).toBe('wifi');
    expect(r.fields).toEqual([
      { label: 'ชื่อเครือข่าย', value: 'Cafe;1' },
      { label: 'รหัสผ่าน', value: 'a:b' },
      { label: 'ระบบเข้ารหัส', value: 'WPA' },
      { label: 'เครือข่ายซ่อนชื่อ', value: 'ใช่' },
    ]);
  });

  it('WiFi ที่ไม่มีรหัสผ่าน', () => {
    const r = classifyQrText('WIFI:T:nopass;S:Free;;');
    expect(r.kind).toBe('wifi');
    expect(r.fields).toContainEqual({ label: 'รหัสผ่าน', value: '(ไม่มี)' });
  });

  it('vCard ดึงชื่อ เบอร์ อีเมล', () => {
    const raw = ['BEGIN:VCARD', 'VERSION:3.0', 'N:ใจดี;สมชาย;;;', 'FN:สมชาย ใจดี', 'TEL;TYPE=CELL:0812345678', 'EMAIL:somchai@example.com', 'END:VCARD'].join('\r\n');
    const r = classifyQrText(raw);
    expect(r.kind).toBe('vcard');
    expect(r.fields).toContainEqual({ label: 'ชื่อ', value: 'สมชาย ใจดี' });
    expect(r.fields).toContainEqual({ label: 'เบอร์โทร', value: '0812345678' });
    expect(r.fields).toContainEqual({ label: 'อีเมล', value: 'somchai@example.com' });
  });

  it('QR PromptPay (EMVCo)', () => {
    const r = classifyQrText('00020101021129370016A000000677010111011300660000000005802TH53037646304A1B2');
    expect(r.kind).toBe('promptpay');
    expect(r.label).toBe('QR PromptPay');
  });

  it('เบอร์โทรและอีเมล', () => {
    expect(classifyQrText('tel:0812345678').kind).toBe('tel');
    expect(classifyQrText('mailto:hi@toolsiam.com').fields[0].value).toBe('hi@toolsiam.com');
  });

  it('ข้อความทั่วไป', () => {
    const r = classifyQrText('สวัสดี ToolSiam');
    expect(r.kind).toBe('text');
    expect(r.fields[0].value).toBe('สวัสดี ToolSiam');
  });

  it('เก็บข้อความดิบไว้เสมอ', () => {
    expect(classifyQrText('tel:02-000-0000').raw).toBe('tel:02-000-0000');
  });

  it('WiFi round-trip: unescape ต้องย้อนค่า escape ของ qr-generator ได้ตรงเดิม (\\ ; , : ")', () => {
    const ssid = 'Cafe\\Net; A, B: "Guest"';
    const password = 'p\\a;s,s:w"d';
    const raw = buildWifiPayload({ ssid, password, encryption: 'WPA', hidden: true });
    const r = classifyQrText(raw);
    expect(r.kind).toBe('wifi');
    expect(r.fields).toContainEqual({ label: 'ชื่อเครือข่าย', value: ssid });
    expect(r.fields).toContainEqual({ label: 'รหัสผ่าน', value: password });
    expect(r.fields).toContainEqual({ label: 'ระบบเข้ารหัส', value: 'WPA' });
    expect(r.fields).toContainEqual({ label: 'เครือข่ายซ่อนชื่อ', value: 'ใช่' });
  });

  it('vCard round-trip: unescape ต้องย้อนค่า escape ของ qr-generator ได้ตรงเดิม (backslash จริง + ขึ้นบรรทัดใหม่ + ; และ ,)', () => {
    const note = 'C:\\notes\\file.txt\nHello; World, Test';
    const raw = buildVCardPayload({ firstName: 'สมชาย', note });
    const r = classifyQrText(raw);
    expect(r.kind).toBe('vcard');
    expect(r.fields).toContainEqual({ label: 'บันทึก', value: note });
  });
});
