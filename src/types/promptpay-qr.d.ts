declare module 'promptpay-qr' {
  /** สร้าง EMVCo payload สำหรับ PromptPay (เบอร์โทร 10 หลัก, เลขบัตร 13 หลัก, e-wallet 15 หลัก) */
  export default function generatePayload(target: string, options?: { amount?: number }): string;
}
