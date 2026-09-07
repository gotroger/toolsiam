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
  'promptpay-qr': () => import('./qr/promptpay-qr/Tool'),
  'json-formatter': () => import('./dev/json-formatter/Tool'),
};
