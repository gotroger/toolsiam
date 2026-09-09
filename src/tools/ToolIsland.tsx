import { lazy, Suspense, useMemo, useSyncExternalStore } from 'react';
import { toolLoaders } from './loaders';
import ErrorBoundary from '@/components/ErrorBoundary';

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

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

  if (!Tool) return <p className="text-red-600">ไม่พบเครื่องมือ: {slug}</p>;

  // Do not expose editable SSR inputs before their React handlers are ready.
  if (!ready) return <ToolLoading />;

  return (
    <ErrorBoundary name={slug}>
      <Suspense fallback={<ToolLoading />}>
        {/* eslint-disable-next-line react-hooks/static-components -- lazy() ถูก memo ด้วย slug จึงเป็นคอมโพเนนต์ตัวเดิมตลอดอายุ island (slug ไม่เปลี่ยนกลางคัน) */}
        <Tool />
      </Suspense>
    </ErrorBoundary>
  );
}
