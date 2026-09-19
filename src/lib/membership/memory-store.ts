import { extendExpiry } from './plan';
import type { MembershipStore, Payment, User } from './store';

/**
 * store ใน memory สำหรับเทสต์ handler — semantics ต้องตรงกับ d1Store ทุกข้อ
 * (ดู store.test.ts ที่ไล่ SQL ของฝั่ง D1 และ handlers.test.ts ที่ใช้ตัวนี้)
 */
export function memoryStore(): MembershipStore & {
  users: Map<string, User>;
  payments: Map<string, Payment>;
  expiry: Map<string, number>;
} {
  const users = new Map<string, User>();
  const payments = new Map<string, Payment>();
  const expiry = new Map<string, number>();
  return {
    users,
    payments,
    expiry,
    async upsertUserFromGoogle(p, _now, newId) {
      const existing = [...users.values()].find((u) => u.googleSub === p.googleSub);
      const user: User = {
        id: existing?.id ?? newId(),
        googleSub: p.googleSub,
        email: p.email,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
      };
      users.set(user.id, user);
      return user;
    },
    async getUser(id) {
      return users.get(id) ?? null;
    },
    async getExpiresAt(userId) {
      return expiry.get(userId) ?? null;
    },
    async createPayment(p) {
      payments.set(p.id, { ...p, status: 'pending', paidAt: null });
    },
    async attachCharge(id, p) {
      const payment = payments.get(id);
      if (payment) payments.set(id, { ...payment, ...p });
    },
    async getPayment(id) {
      return payments.get(id) ?? null;
    },
    async findPaymentByChargeId(chargeId) {
      return [...payments.values()].find((p) => p.beamChargeId === chargeId) ?? null;
    },
    async latestPendingPayment(userId, now) {
      return (
        [...payments.values()]
          .filter((p) => p.userId === userId && p.status === 'pending' && p.qrExpiresAt > now)
          .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
      );
    },
    async listPayments(userId, limit) {
      return [...payments.values()]
        .filter((p) => p.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },
    async expirePayment(id) {
      const payment = payments.get(id);
      if (payment?.status === 'pending') payments.set(id, { ...payment, status: 'expired' });
    },
    async settlePayment(id, p) {
      const payment = payments.get(id);
      if (!payment) return { applied: false, expiresAt: null };
      const current = expiry.get(payment.userId) ?? null;
      // รวม expired ด้วย ตามเหตุผลของ SETTLEABLE ใน store.ts — เงินที่โอนแล้วต้องได้สิทธิ์เสมอ
      if (payment.status === 'paid') return { applied: false, expiresAt: current };
      const next = extendExpiry(current, p.now, p.days);
      expiry.set(payment.userId, next);
      payments.set(id, { ...payment, status: 'paid', beamChargeId: p.beamChargeId, paidAt: p.now });
      return { applied: true, expiresAt: next };
    },
  };
}
