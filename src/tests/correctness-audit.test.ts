import { it, expect } from 'vitest';
import { dateDiffParts } from '@/lib/date';
import { calculateSeverance } from '@/tools/finance/severance-pay/logic';
import { calculateTax, type TaxInput } from '@/tools/finance/thai-income-tax/logic';
import { calculateNetSalary } from '@/tools/finance/net-salary/logic';
import { calculateOt } from '@/lib/payroll';
import { normalizeTarget } from '@/tools/qr/promptpay-qr/logic';
import { addDays, shiftDate } from '@/lib/date';
import { minifyJson } from '@/tools/dev/json-formatter/logic';
import { formatJson } from '@/tools/dev/json-formatter/logic';
import { fromPayment } from '@/tools/loan/flat-effective-rate/logic';
import { homeLoan } from '@/tools/loan/home-loan/logic';
import { shopProfit } from '@/lib/pricing';
import { businessDaysBetween } from '@/tools/date/thai-holidays/logic';
import { compoundGrowth, monthlyForGoal } from '@/tools/finance/compound-interest/logic';
const basic: TaxInput = {
  annualIncome: 600000,
  hasSpouseNoIncome: false,
  children: 0,
  childrenBorn2018Plus: 0,
  parents: 0,
  socialSecurity: 9000,
  lifeInsurance: 0,
  healthInsurance: 0,
  retirementFunds: 0,
  thaiEsg: 0,
  homeLoanInterest: 0,
  donations: 0,
  otherDeductions: 0,
  withheldTax: 0,
};
it('baseline: tax salary 600000 deductions 169000 = 20600', () => expect(calculateTax(basic).tax).toBe(20600));
it('date interval cannot contain negative days: 31 Jan to 1 Mar', () =>
  expect(dateDiffParts('2025-01-31', '2025-03-01').days).toBeGreaterThanOrEqual(0));
it('severance must not reach six years on 30 Dec 2025 from 1 Jan 2020', () =>
  expect(
    calculateSeverance({ monthlySalary: 30000, startDate: '2020-01-01', endDate: '2025-12-30', divisor: 30 }).payDays,
  ).toBe(180));
it('severance rounding: 20000 salary 400 days = 266666.67', () =>
  expect(
    calculateSeverance({ monthlySalary: 20000, startDate: '2000-01-01', endDate: '2025-01-01', divisor: 30 }).amount,
  ).toBe(266666.67));
it('Thai ESG 600000 income allows 180000, not 300000', () =>
  expect(calculateTax({ ...basic, thaiEsg: 300000 }).tax).toBe(5050));
it('invalid child count must not be accepted', () => expect(() => calculateTax({ ...basic, children: 1.5 })).toThrow());
it('JSON formatter preserves integer digits', () =>
  expect(formatJson('{"id":9007199254740993}')).toEqual({ ok: true, output: '{\n  "id": 9007199254740993\n}' }));
it('underpaid loan must not claim zero effective interest', () =>
  expect(() => fromPayment(120000, 1000, 12)).toThrow());
it('no-promo home loan ignores unused promotional interest', () =>
  expect(
    homeLoan({ price: 120000, downPayment: 0, years: 1, promoRate: 0.5, promoMonths: 0, afterRate: 0 }).minimumPayment,
  ).toBe(10000));
it('tiny goal duration must not output infinity', () =>
  expect(() =>
    monthlyForGoal({ goal: 100000, principal: 0, annualRate: 0, years: 0.01, compoundsPerYear: 12 }),
  ).toThrow('อย่างน้อย 1 เดือน'));
it('compound saving 10000 + 1000 monthly at 0% one year = 22000', () =>
  expect(
    compoundGrowth({ principal: 10000, monthlyDeposit: 1000, annualRate: 0, years: 1, compoundsPerYear: 12 })
      .futureValue,
  ).toBe(22000));
it('shop profit benchmark: 450 - 200 - 40 - 36 - 30 = 144', () =>
  expect(
    shopProfit({ price: 500, cost: 200, discount: 50, shipping: 40, feePercent: 8, adCost: 30, quantity: 10 })
      .totalProfit,
  ).toBe(1440));
it('ordinary nationwide weekday stays open (Bangkok exception needs separate scope)', () =>
  expect(businessDaysBetween('2026-10-16', '2026-10-16', 'bank').businessDays).toBe(1));

it('SSO 2026: 30k salary uses 10500 deduction and 1975 annual tax', () => {
  const r = calculateNetSalary({
    monthlySalary: 30000,
    bonus: 0,
    otherIncome: 0,
    hasSocialSecurity: true,
    hasSpouseNoIncome: false,
    children: 0,
    parents: 0,
    lifeInsurance: 0,
    retirementFunds: 0,
    homeLoanInterest: 0,
    otherDeductions: 0,
    asOf: '2026-09-09',
  });
  expect(r.ssoDeductible).toBe(10500);
  expect(r.annualTax).toBe(1975);
  expect(r.netMonthly).toBe(28960.42);
});
it('tax years cannot share outdated SSO cap', () => {
  expect(calculateTax({ ...basic, taxYear: 2025, socialSecurity: 10500 }).tax).toBe(20600);
  expect(calculateTax({ ...basic, taxYear: 2026, socialSecurity: 10500 }).tax).toBe(20450);
  expect(() => calculateTax({ ...basic, taxYear: 2027 })).toThrow();
});
it('RMF and PVD caps apply before combined retirement cap', () => {
  expect(calculateTax({ ...basic, rmf: 300000 }).tax).toBe(5050);
  expect(calculateTax({ ...basic, providentFund: 300000 }).tax).toBe(11600);
  expect(calculateTax({ ...basic, pensionInsurance: 300000 }).tax).toBe(11600);
});
it('ordinary donations capped on remainder after double deduction', () => {
  const r = calculateTax({ ...basic, doubleDonations: 50000, donations: 50000 });
  expect(r.donationUsed).toBe(81890);
  expect(r.netIncome).toBe(349110);
  expect(r.tax).toBe(12411);
});
it('invalid amounts and people must not silently reduce tax', () => {
  for (const value of [NaN, Infinity, -1]) expect(() => calculateTax({ ...basic, healthInsurance: value })).toThrow();
  expect(() => calculateTax({ ...basic, parents: 3 })).toThrow();
});
it('paid holiday adds 1x, unpaid holiday adds 2x', () => {
  const base = { monthlySalary: 30000, workDaysPerMonth: 30, hoursPerDay: 8 };
  const lines = [
    { kind: 'workdayOt' as const, hours: 10 },
    { kind: 'holidayWork' as const, hours: 8 },
    { kind: 'holidayOt' as const, hours: 2 },
  ];
  expect(calculateOt(base, lines).totalOt).toBe(3625);
  expect(calculateOt({ ...base, paidHoliday: false }, lines).totalOt).toBe(4625);
});
it('calendar parts reconstruct all end-of-month intervals', () => {
  for (const start of ['2024-01-31', '2024-02-29', '2025-01-31', '2025-08-31'])
    for (let offset = 0; offset < 800; offset++) {
      const end = addDays(start, offset);
      const p = dateDiffParts(start, end);
      expect(p.days).toBeGreaterThanOrEqual(0);
      expect(p.months).toBeGreaterThanOrEqual(0);
      expect(p.months).toBeLessThan(12);
      expect(addDays(shiftDate(start, p.years * 12 + p.months, 'month'), p.days)).toBe(end);
    }
});
it('severance inclusive 119/120 days and each calendar anniversary', () => {
  const base = { monthlySalary: 30000, startDate: '2020-01-01', endDate: '2020-04-28', divisor: 30 as const };
  expect(calculateSeverance(base).payDays).toBe(0);
  expect(calculateSeverance({ ...base, endDate: '2020-04-29' }).payDays).toBe(30);
  for (const [years, previous, next] of [
    [1, 30, 90],
    [3, 90, 180],
    [6, 180, 240],
    [10, 240, 300],
    [20, 300, 400],
  ]) {
    const anniversary = shiftDate(base.startDate, years, 'year');
    expect(calculateSeverance({ ...base, endDate: addDays(anniversary, -2) }).payDays).toBe(previous);
    expect(calculateSeverance({ ...base, endDate: addDays(anniversary, -1) }).payDays).toBe(next);
  }
});
it('Bangkok holiday applies to both calendars and WFH remains working', () => {
  for (const cal of ['bank', 'government'] as const) {
    expect(businessDaysBetween('2026-10-16', '2026-10-16', cal, 'bangkok').businessDays).toBe(0);
    for (const day of ['12', '14', '15'])
      expect(businessDaysBetween(`2026-10-${day}`, `2026-10-${day}`, cal, 'bangkok').businessDays).toBe(1);
  }
});
it('full-term promotional rate ignores unused later rate', () => {
  expect(
    homeLoan({ price: 120000, downPayment: 0, years: 1, promoRate: 0, promoMonths: 12, afterRate: 0.5 }).minimumPayment,
  ).toBe(10000);
});
it('QR target rejects letters instead of deleting them', () => {
  expect(() => normalizeTarget('abc0812345678')).toThrow();
  expect(normalizeTarget('+66 81-234-5678').value).toBe('0812345678');
});
it('JSON formatter preserves exponent, decimal precision, duplicate keys and escapes', () => {
  const input = String.raw`{"a":1e400,"a":0.123456789012345678901,"s":"x \" : , [ ]", "arr":[{}, [],true,null]}`;
  const pretty = formatJson(input);
  expect(pretty.ok).toBe(true);
  if (pretty.ok) expect(minifyJson(pretty.output)).toEqual(minifyJson(input));
  const minimized = minifyJson(input);
  if (minimized.ok) {
    expect(minimized.output).toContain('1e400');
    expect(minimized.output).toContain('0.123456789012345678901');
  }
});
it('goal saving rounded up reaches small target', () => {
  const input = { goal: 1, principal: 0, annualRate: 0, years: 1, compoundsPerYear: 12 };
  const monthlyDeposit = monthlyForGoal(input);
  expect(compoundGrowth({ ...input, monthlyDeposit }).futureValue).toBeGreaterThanOrEqual(1);
});

it('all main tax categories combine without overlap', () => {
  expect(
    calculateTax({
      ...basic,
      taxYear: 2026,
      annualIncome: 1500000,
      children: 1,
      childrenBorn2018Plus: 1,
      parents: 2,
      socialSecurity: 10500,
      lifeInsurance: 50000,
      healthInsurance: 25000,
      rmf: 100000,
      providentFund: 50000,
      pensionInsurance: 20000,
      thaiEsg: 100000,
      homeLoanInterest: 20000,
      doubleDonations: 1000,
      donations: 1000,
      withheldTax: 30000,
    }).tax,
  ).toBe(77300);
});

it('PVD exempt portion reduces the expense base before the 50% deduction', () => {
  const r = calculateTax({ ...basic, annualIncome: 180000, providentFund: 27000, socialSecurity: 0 });
  expect(r.expense).toBe(81500); // (180000 - (27000 - 10000)) / 2
  expect(r.netIncome).toBe(11500);
});
