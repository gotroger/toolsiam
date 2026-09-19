import { useEffect, useState } from 'react';
import { Alert, Button, CopyButton, EmptyState, Stat } from '@/components/ui';
import { __setPlanForTests, refreshPlan, usePlan, type PlanState } from '@/lib/plan-client';
import { PREMIUM_DAYS, PREMIUM_PRICE_BAHT } from '@/lib/plan-limits';
import { daysLeft } from '@/lib/membership/plan';
import {
  getAccountUrl,
  getBillingStatusUrl,
  getCheckoutApiUrl,
  getLoginUrl,
  getLogoutUrl,
  getPremiumUrl,
} from '@/lib/routes';
import { formatThaiDate } from '@/lib/thai-date';

export { __setPlanForTests };

/**
 * หน้าบัญชี — island เดียวที่ถือ state ของสมาชิกทั้งหมด
 *
 * โปรไฟล์และแพลนมาจาก usePlan() (module store ตัวเดียวกับ FileTool)
 * ส่วนซื้อ 30 วันอยู่ใน BuyPremium ด้านล่าง: POST checkout → QR → poll status → refreshPlan()
 */
export default function AccountPanel() {
  const state = usePlan();
  const loginError = useLoginErrorFlag();
  if (state.status === 'unknown') {
    return (
      <div className="tool-loading" role="status">
        <p className="text-slate-500">กำลังตรวจสอบสถานะบัญชี…</p>
      </div>
    );
  }
  if (state.status === 'off') {
    return (
      <EmptyState
        title="ระบบสมาชิกปิดปรับปรุงชั่วคราว"
        description="เครื่องมือทุกตัวยังใช้งานได้ตามปกติ กรุณากลับมาใหม่ภายหลัง"
      />
    );
  }
  if (state.status === 'anonymous') {
    return (
      <div className="space-y-4">
        {loginError && (
          <Alert tone="danger" title="เข้าสู่ระบบไม่สำเร็จ">
            Google ไม่ยืนยันบัญชีนี้ หรือการเชื่อมต่อขัดข้อง กรุณาลองใหม่อีกครั้ง
          </Alert>
        )}
        <EmptyState
          title="ยังไม่ได้เข้าสู่ระบบ"
          description={`เข้าสู่ระบบด้วยบัญชี Google เพื่อสมัครสมาชิกพรีเมียม ${PREMIUM_PRICE_BAHT} บาทต่อ ${PREMIUM_DAYS} วัน — เครื่องมือทุกตัวยังใช้ฟรีโดยไม่ต้องเข้าสู่ระบบ`}
          action={
            <a
              href={getLoginUrl(getAccountUrl())}
              className="product-button inline-flex bg-action px-4 py-2 text-sm font-medium text-white hover:bg-action-hover"
            >
              เข้าสู่ระบบด้วย Google
            </a>
          }
        />
      </div>
    );
  }
  return <SignedIn state={state} />;
}

/**
 * `?error=google` มาจาก callback เมื่อ Google ไม่ยืนยันบัญชี — อ่านตอน mount เท่านั้น
 * ไม่ทำให้ hydration ไม่ตรง เพราะเฟรมแรก status ยังเป็น unknown ซึ่งไม่ render ค่านี้
 */
function useLoginErrorFlag(): boolean {
  const [flag] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('error') === 'google';
    } catch {
      return false;
    }
  });
  return flag;
}

function SignedIn({ state }: { state: PlanState }) {
  const user = state.user!;
  const premium = state.plan === 'premium' && state.premiumUntil != null;
  const untilIso = state.premiumUntil ? new Date(state.premiumUntil * 1000).toISOString().slice(0, 10) : null;
  // เวลาอ่านครั้งเดียวตอน mount — หน้านี้ไม่ต้องเดินนาฬิกาเอง (นับถอยหลังของ QR อยู่ใน BuyPremium)
  const [mountedAt] = useState(() => Math.floor(Date.now() / 1000));
  const left = state.premiumUntil ? daysLeft(state.premiumUntil, mountedAt) : 0;
  return (
    <div className="space-y-6">
      {state.expiringSoon && (
        <Alert tone="note" title={`พรีเมียมจะหมดอายุใน ${left} วัน`}>
          ต่ออายุได้เลย วันที่เหลือจะถูกบวกเพิ่มต่อจากวันหมดอายุเดิม ไม่หายไป
        </Alert>
      )}
      <section aria-label="โปรไฟล์" className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-slate-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-xl font-medium text-brand-700"
          >
            {user.displayName.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-medium text-slate-900">{user.displayName}</p>
          <p className="truncate text-sm text-slate-600">{user.email}</p>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="แพลนปัจจุบัน" value={premium ? 'สมาชิกพรีเมียม' : 'ฟรี'} />
        <Stat
          label={premium ? 'ใช้ได้ถึง' : 'สมาชิกพรีเมียม'}
          value={
            premium && untilIso
              ? `${formatThaiDate(untilIso, { style: 'medium' })} (อีก ${left} วัน)`
              : `${PREMIUM_PRICE_BAHT} บาท / ${PREMIUM_DAYS} วัน`
          }
        />
      </div>
      <BuyPremium premium={premium} />
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 text-sm">
        <a className="text-brand-700 underline" href={getPremiumUrl()}>
          ดูสิทธิ์ของสมาชิกพรีเมียม
        </a>
        {/* ฟอร์ม POST จริง — ทำงานได้แม้ JS พัง และผ่าน Origin check ฝั่ง server */}
        <form method="post" action={getLogoutUrl()} className="ml-auto">
          <Button type="submit" variant="secondary">
            ออกจากระบบ
          </Button>
        </form>
      </div>
    </div>
  );
}

interface Checkout {
  paymentId: string;
  imageBase64: string;
  rawData: string;
  /** unix seconds */
  expiresAt: number;
}
type BuyStatus = 'idle' | 'creating' | 'pending' | 'paid' | 'expired';

/** สลับ interval หลัง 2 นาทีเพื่อลดโหลด — คนส่วนใหญ่สแกนจ่ายในนาทีแรก */
const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 5000;
const POLL_SLOW_AFTER_MS = 120_000;

export function BuyPremium({ premium }: { premium: boolean }) {
  const [status, setStatus] = useState<BuyStatus>('idle');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  async function start() {
    setError('');
    setStatus('creating');
    try {
      const res = await fetch(getCheckoutApiUrl(), { method: 'POST', credentials: 'same-origin', cache: 'no-store' });
      if (res.status === 204) throw new Error('ระบบชำระเงินยังไม่เปิดให้บริการในขณะนี้');
      if (res.status === 401) {
        await refreshPlan();
        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'สร้าง QR ไม่สำเร็จ กรุณาลองใหม่');
      }
      const body = (await res.json()) as Checkout;
      setCheckout(body);
      setNow(Math.floor(Date.now() / 1000));
      setStatus('pending');
    } catch (e) {
      setStatus('idle');
      setError(e instanceof Error ? e.message : 'สร้าง QR ไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  // นาฬิกานับถอยหลัง — เดินเฉพาะตอนมี QR ค้างอยู่
  useEffect(() => {
    if (status !== 'pending') return;
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // poll สถานะ — DB ฝั่ง server เป็นความจริง (webhook ของ Beam อัปเดตให้)
  useEffect(() => {
    if (status !== 'pending' || !checkout) return;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(getBillingStatusUrl(checkout.paymentId), {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (stopped) return;
        if (res.status === 401) {
          await refreshPlan();
          setStatus('idle');
          return;
        }
        if (res.ok) {
          const body = (await res.json()) as { status: 'pending' | 'paid' | 'expired' };
          if (body.status === 'paid') {
            setStatus('paid');
            await refreshPlan();
            return;
          }
          if (body.status === 'expired') {
            setStatus('expired');
            return;
          }
        }
      } catch {
        /* เครือข่ายสะดุด — รอบหน้าลองใหม่ */
      }
      if (!stopped) timer = setTimeout(tick, Date.now() - startedAt > POLL_SLOW_AFTER_MS ? POLL_SLOW_MS : POLL_FAST_MS);
    };
    timer = setTimeout(tick, POLL_FAST_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [status, checkout]);

  const secondsLeft = checkout ? Math.max(0, checkout.expiresAt - now) : 0;
  const countdown = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const label = premium
    ? `ต่ออายุอีก ${PREMIUM_DAYS} วัน · ${PREMIUM_PRICE_BAHT} บาท`
    : `สมัคร ${PREMIUM_DAYS} วัน · ${PREMIUM_PRICE_BAHT} บาท`;

  return (
    <section aria-label="ชำระเงิน" className="space-y-4 rounded-xl border border-brand-600/20 bg-brand-50 p-4">
      {status === 'paid' && (
        <Alert tone="note" title="ชำระเงินสำเร็จ">
          ขอบคุณที่สนับสนุนทูลสยาม สิทธิ์สมาชิกพรีเมียมของคุณอัปเดตแล้ว
        </Alert>
      )}
      {status === 'expired' && (
        <Alert tone="note" title="QR หมดอายุแล้ว">
          ยังไม่มีการชำระเงิน สร้าง QR ใหม่ได้โดยไม่มีค่าใช้จ่าย
        </Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {status === 'pending' && checkout ? (
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
          <img
            src={`data:image/png;base64,${checkout.imageBase64}`}
            alt="QR PromptPay สำหรับชำระเงิน"
            width={220}
            height={220}
            className="mx-auto h-56 w-56 rounded-lg border border-slate-200 bg-white p-2"
          />
          <div className="space-y-3 text-sm">
            <p className="font-medium text-slate-900">สแกนด้วยแอปธนาคารเพื่อชำระ {PREMIUM_PRICE_BAHT} บาท</p>
            <p role="status" aria-live="polite" className="text-slate-600">
              QR หมดอายุใน <span className="tabular-nums font-medium">{countdown}</span> · กำลังรอการชำระเงิน…
            </p>
            {checkout.rawData && (
              <div className="space-y-1">
                <p className="text-slate-600">เปิดจากมือถือเครื่องเดียวกัน? คัดลอกรหัสไปวางในแอปธนาคาร</p>
                <CopyButton text={checkout.rawData} label="คัดลอกรหัส PromptPay" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void start()} disabled={status === 'creating'} aria-busy={status === 'creating'}>
            {status === 'creating' ? 'กำลังสร้าง QR…' : label}
          </Button>
          <p className="text-sm text-slate-600">สแกน QR PromptPay · ไม่ตัดเงินอัตโนมัติ</p>
        </div>
      )}
    </section>
  );
}
