import { lazy, Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { toolLoaders } from './loaders';
import ErrorBoundary from '@/components/ErrorBoundary';
import { recordUsage } from '@/lib/usage-client';

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/**
 * "ลงมือใช้" = พิมพ์ เลือก วางไฟล์ หรือกดตัวควบคุมใด ๆ ในกล่องเครื่องมือ (spec usage-counter §2)
 * คลิกพื้นที่ว่างไม่นับ — ไม่งั้นแค่แตะเพื่อเลื่อนหน้าบนมือถือก็กลายเป็นการใช้งาน
 */
const USE_EVENTS = ['input', 'change', 'click', 'drop'] as const;
const CONTROL = 'button, a, input, select, textarea, label, summary, [role="button"], [role="tab"], [role="radio"]';

function isUse(event: Event): boolean {
  if (event.type !== 'click') return true;
  return event.target instanceof Element && event.target.closest(CONTROL) !== null;
}

function ToolLoading() {
  return (
    <div className="tool-loading" role="status">
      <p className="text-slate-500">กำลังโหลดเครื่องมือ…</p>
      <div className="tool-loading-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function ToolIsland({ slug }: { slug: string }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const Tool = useMemo(() => {
    const load = toolLoaders[slug];
    return load ? lazy(load) : null;
  }, [slug]);
  const root = useRef<HTMLDivElement>(null);

  // ตัวนับการใช้งาน: จุดเดียวที่ครอบทุกเครื่องมือ ไม่ต้องแตะ Tool.tsx รายตัว
  // ยิงเฉพาะฝั่งเบราว์เซอร์หลังเครื่องมือพร้อมรับ input แล้ว และไม่ยิงซ้ำในแท็บเดียวกัน (usage-client.ts)
  useEffect(() => {
    const el = root.current;
    if (!ready || !Tool || !el) return;
    recordUsage(slug, 'view');
    const detach = () => USE_EVENTS.forEach((type) => el.removeEventListener(type, onUse, true));
    function onUse(event: Event) {
      if (!isUse(event)) return;
      recordUsage(slug, 'use');
      detach();
    }
    USE_EVENTS.forEach((type) => el.addEventListener(type, onUse, true));
    return detach;
  }, [ready, Tool, slug]);

  if (!Tool) return <p className="text-red-600">ไม่พบเครื่องมือ: {slug}</p>;

  // Do not expose editable SSR inputs before their React handlers are ready.
  if (!ready) return <ToolLoading />;

  // `contents` = ไม่สร้างกล่องใหม่ใน layout แต่ยังเป็นจุดรับ event ที่ bubble ขึ้นมาจากเครื่องมือได้
  return (
    <div ref={root} className="contents">
      <ErrorBoundary name={slug}>
        <Suspense fallback={<ToolLoading />}>
          {/* eslint-disable-next-line react-hooks/static-components -- lazy() ถูก memo ด้วย slug จึงเป็นคอมโพเนนต์ตัวเดิมตลอดอายุ island (slug ไม่เปลี่ยนกลางคัน) */}
          <Tool />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
