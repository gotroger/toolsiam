import type { ComponentType } from 'react';

export type ToolLoader = () => Promise<{ default: ComponentType }>;

/** slug → dynamic import ของ Tool.tsx (code-split ต่อเครื่องมือ) */
export const toolLoaders: Record<string, ToolLoader> = {
  'thai-income-tax': () => import('./finance/thai-income-tax/Tool'),
  'loan-installment': () => import('./finance/loan-installment/Tool'),
  'net-salary': () => import('./finance/net-salary/Tool'),
  'vat-wht': () => import('./finance/vat-wht/Tool'),
  'compound-interest': () => import('./finance/compound-interest/Tool'),
  'baht-text': () => import('./text/baht-text/Tool'),
  'word-count': () => import('./text/word-count/Tool'),
  'thai-numerals': () => import('./text/thai-numerals/Tool'),
  'text-lines': () => import('./text/text-lines/Tool'),
  'thai-id-check': () => import('./text/thai-id-check/Tool'),
  'age-days': () => import('./date/age-days/Tool'),
  'thai-year-convert': () => import('./date/thai-year-convert/Tool'),
  'thai-holidays': () => import('./date/thai-holidays/Tool'),
  'promptpay-qr': () => import('./qr/promptpay-qr/Tool'),
  'qr-generator': () => import('./qr/qr-generator/Tool'),
  'qr-reader': () => import('./qr/qr-reader/Tool'),
  'json-formatter': () => import('./dev/json-formatter/Tool'),
  'date-add': () => import('./date/date-add/Tool'),
  'work-tenure': () => import('./finance/work-tenure/Tool'),
  'ot-calculator': () => import('./finance/ot-calculator/Tool'),
  'land-unit-convert': () => import('./land/land-unit-convert/Tool'),
  'land-price': () => import('./land/land-price/Tool'),
  'fuel-cost': () => import('./daily/fuel-cost/Tool'),
  'profit-margin': () => import('./business/profit-margin/Tool'),
  'selling-price': () => import('./business/selling-price/Tool'),
};
