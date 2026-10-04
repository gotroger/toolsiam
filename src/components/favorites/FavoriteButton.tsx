import { useEffect } from 'react';
import { useFavorites, type UseFavorites } from '@/lib/favorites-client';
import { getLoginUrl, getToolUrl } from '@/lib/routes';

/**
 * ปุ่มดาวในหน้าเครื่องมือ (spec 2026-10-04-favorites-design)
 *
 * - ยังไม่รู้สถานะ / ระบบปิด / โหลดไม่สำเร็จ → ตัวจองที่แบบล่องหน ขนาดเท่าปุ่มจริง ไม่มี layout shift
 * - ไม่ได้ล็อกอิน → ลิงก์เข้าสู่ระบบ แล้วกลับมาหน้านี้พร้อม `?favorite=add` เพื่อบันทึกให้ทันที
 * - ล็อกอินอยู่ → ปุ่มสลับ (aria-pressed)
 */
export const FAVORITE_PARAM = 'favorite';
const LABEL = 'รายการโปรด';

export default function FavoriteButton({ slug }: { slug: string }) {
  const fav = useFavorites();
  useAddAfterLogin(slug, fav);

  if (fav.plan.status === 'anonymous') {
    return (
      <a
        className="favorite-button"
        href={getLoginUrl(`${getToolUrl(slug)}?${FAVORITE_PARAM}=add`)}
        rel="nofollow"
        title="เข้าสู่ระบบด้วย Google เพื่อบันทึกเครื่องมือนี้ไว้ในรายการโปรด"
      >
        <span className="favorite-star" aria-hidden="true">
          ☆
        </span>
        บันทึกเป็น{LABEL}
      </a>
    );
  }

  if (fav.plan.status === 'signedIn' && fav.status === 'ready') {
    const on = fav.isFavorite(slug);
    const busy = fav.pending.includes(slug);
    return (
      <>
        <button
          type="button"
          className="favorite-button"
          aria-pressed={on}
          aria-disabled={busy || undefined}
          onClick={() => {
            if (!busy) void fav.setFavorite(slug, !on);
          }}
        >
          <span className="favorite-star" aria-hidden="true">
            {on ? '★' : '☆'}
          </span>
          {LABEL}
        </button>
        <span role="status" className="favorite-error">
          {fav.error}
        </span>
      </>
    );
  }

  return (
    <span className="favorite-button" data-placeholder aria-hidden="true">
      <span className="favorite-star">☆</span>
      บันทึกเป็น{LABEL}
    </span>
  );
}

/**
 * กลับมาจากหน้า Google พร้อม `?favorite=add` → บันทึกให้เลยแล้วลบพารามิเตอร์ทิ้ง
 * (รีเฟรชหรือกดย้อนกลับจะได้ไม่บันทึกซ้ำหลังผู้ใช้เอาดาวออกเอง)
 */
function useAddAfterLogin(slug: string, fav: UseFavorites) {
  const ready = fav.plan.status === 'signedIn' && fav.status === 'ready';
  const already = fav.isFavorite(slug);
  const { setFavorite } = fav;
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(FAVORITE_PARAM) !== 'add') return;
    url.searchParams.delete(FAVORITE_PARAM);
    window.history.replaceState(window.history.state, '', url);
    if (!already) void setFavorite(slug, true);
  }, [ready, already, slug, setFavorite]);
}
