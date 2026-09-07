import type { ComponentType } from 'react';

export type ToolLoader = () => Promise<{ default: ComponentType }>;

/** slug → dynamic import ของ Tool.tsx (code-split ต่อเครื่องมือ) */
export const toolLoaders: Record<string, ToolLoader> = {};
