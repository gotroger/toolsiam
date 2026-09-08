import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cx } from './styles';

export interface TabItem {
  id: string;
  label: string;
}

/**
 * Tabs ตาม WAI-ARIA — ลูกศรซ้าย/ขวา + Home/End ย้ายแท็บ, Tab ออกจากชุดแท็บไปยัง panel (A2)
 * ใช้ roving tabindex: มีแท็บเดียวที่ tabIndex=0
 */
export function Tabs({
  tabs, value, onChange, label, idPrefix,
}: { tabs: TabItem[]; value: string; onChange: (id: string) => void; label: string; idPrefix?: string }) {
  const auto = useId();
  const prefix = idPrefix ?? auto;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function move(delta: number) {
    const i = tabs.findIndex((t) => t.id === value);
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-[10px] bg-slate-100 p-1">
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            id={tabId(prefix, t.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(prefix, t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
              else if (e.key === 'Home') { e.preventDefault(); onChange(tabs[0].id); refs.current[tabs[0].id]?.focus(); }
              else if (e.key === 'End') { e.preventDefault(); const last = tabs[tabs.length - 1]; onChange(last.id); refs.current[last.id]?.focus(); }
            }}
            className={cx(
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1',
              selected ? 'bg-white text-brand-700 shadow-[0_1px_2px_0_rgb(16_24_40/0.06)]' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function tabId(prefix: string, id: string) { return `${prefix}-tab-${id}`; }
function tabPanelId(prefix: string, id: string) { return `${prefix}-panel-${id}`; }

export function TabPanel({
  id, active, idPrefix, children,
}: { id: string; active: boolean; idPrefix: string; children: ReactNode }) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={tabPanelId(idPrefix, id)} aria-labelledby={tabId(idPrefix, id)} tabIndex={0}>
      {children}
    </div>
  );
}
