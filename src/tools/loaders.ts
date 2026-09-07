import type { ComponentType } from 'react';

export type ToolLoader = () => Promise<{ default: ComponentType }>;

/** slug → dynamic import ของ Tool.tsx (code-split ต่อเครื่องมือ) */
export const toolLoaders: Record<string, ToolLoader> = {
  'loan-installment': () => import('./finance/loan-installment/Tool'),
  'baht-text': () => import('./text/baht-text/Tool'),
};
