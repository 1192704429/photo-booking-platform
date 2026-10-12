import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchMyFavoritePhotographers,
  formatScore,
  formatSpecialty,
  isLoggedIn,
  togglePhotographerFavorite,
  type Photographer,
} from "../../api";
import "./favorites.css";

const FAVORITES_PATH = "/favorites";
const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(FAVORITES_PATH)}`;
}

export function FavoritesPage(): ReactNode {
  const navigate = useNavigate();
  const [list, setList] = useState<Photographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchMyFavoritePhotographers()
      .then((data) => {
        if (!cancelled) setList(data ?? []);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        setList([]);
        setError(err.message || "收藏列表加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleUnfavorite(item: Photographer) {
    const name = item.nickname || "该摄影师";
    const confirmed = window.confirm(`确认取消收藏「${name}」吗？`);
    if (!confirmed) return;

    setActionError(null);
    setRemovingId(item.id);
    try {
      const stillFavorited = await togglePhotographerFavorite(item.id);
      if (!stillFavorited) {
        setList((prev) => prev.filter((row) => row.id !== item.id));
      }
    } catch (err) {
      const error = err as Error & { code?: number };
      if (error.code === 401) {
        void navigate(loginRedirect(), { replace: true });
        return;
      }
      setActionError(error.message || "取消收藏失败");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="app-shell">
      <main className="favorites-page">
        <Link to="/mine" className="favorites-back">
          ← 返回我的
        </Link>
        <header className="favorites-header">
          <p className="favorites-brand">约拍</p>
          <h1>我的收藏</h1>
          <p className="favorites-sub">仅展示并操作你自己收藏的摄影师</p>
        </header>

        {loading ? <p className="favorites-state">加载中…</p> : null}
        {error ? (
          <div className="favorites-state error" role="alert">
            {error}
          </div>
        ) : null}
        {actionError ? (
          <div className="favorites-state error" role="alert">
            {actionError}
          </div>
        ) : null}

        {!loading && !error && list.length === 0 ? (
          <div className="favorites-state empty">
            <p>还没有收藏摄影师</p>
            <Link to="/photographers">去挑选摄影师</Link>
          </div>
        ) : null}

        <section className="favorites-list" aria-label="收藏摄影师列表">
          {list.map((item) => (
            <article key={item.id} className="favorites-card">
              <Link className="favorites-card-main" to={`/photographer/${item.id}`}>
                <img
                  className="favorites-avatar"
                  src={item.avatar || FALLBACK_AVATAR}
                  alt=""
                />
                <div className="favorites-body">
                  <div className="favorites-title-row">
                    <h2>{item.nickname || "摄影师"}</h2>
                    <span className="favorites-score">{formatScore(item.averageScore)}</span>
                  </div>
                  <p className="favorites-line">
                    <span className="label">擅长风格</span>
                    {formatSpecialty(item.specialtyStyle)}
                  </p>
                  <p className="favorites-line">
                    <span className="label">服务城市</span>
                    {item.serviceCity || item.city || "城市待完善"}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                className="favorites-unfav"
                disabled={removingId === item.id}
                onClick={() => void handleUnfavorite(item)}
              >
                {removingId === item.id ? "处理中…" : "取消收藏"}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
