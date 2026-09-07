import { lazy, Suspense, useMemo } from 'react';
import { toolLoaders } from './loaders';

export default function ToolIsland({ slug }: { slug: string }) {
  const Tool = useMemo(() => {
    const load = toolLoaders[slug];
    return load ? lazy(load) : null;
  }, [slug]);

  if (!Tool) return <p className="text-red-600">ไม่พบเครื่องมือ: {slug}</p>;

  return (
    <Suspense fallback={<p className="text-slate-500">กำลังโหลดเครื่องมือ…</p>}>
      <Tool />
    </Suspense>
  );
}
