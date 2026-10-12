import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  deleteStudioWork,
  fetchStudioWork,
  isLoggedIn,
  STYLE_LABELS,
  type StudioWork,
} from "../../api";
import "./works.css";

const FALLBACK =
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80";

function styleLabel(styleType?: number): string {
  if (styleType == null) return "风格未设";
  return STYLE_LABELS[styleType] || "其他";
}

function splitImages(work?: StudioWork | null): string[] {
  if (!work) return [];
  const raw = work.workImages || work.coverImage || "";
  return raw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WorkDetailPage(): ReactNode {
  const { id } = useParams();
  const workId = Number(id);
  const navigate = useNavigate();
  const [work, setWork] = useState<StudioWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(`/studio/works/${id}`)}`, {
        replace: true,
      });
      return;
    }
    if (!Number.isFinite(workId)) {
      setError("无效作品");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioWork(workId)
      .then((data) => {
        if (!cancelled) setWork(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(`/studio/works/${id}`)}`, {
            replace: true,
          });
          return;
        }
        setError(err.message || "作品加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, workId]);

  const images = useMemo(() => splitImages(work), [work]);

  async function onDelete() {
    if (!work) return;
    const confirmed = window.confirm(`确认删除作品「${work.workTitle}」吗？删除后不可恢复。`);
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStudioWork(work.id);
      void navigate("/studio/works", { replace: true });
    } catch (err) {
      setError((err as Error).message || "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="works-page">
        <Link to="/studio/works" className="works-back">
          ← 返回作品列表
        </Link>
        <header className="works-header">
          <div>
            <p className="works-brand">约拍 · 工作室</p>
            <h1>作品详情</h1>
            <p className="works-sub">查看完整内容，支持编辑或删除</p>
          </div>
        </header>

        {loading ? <p className="works-state">加载中…</p> : null}
        {error ? (
          <div className="works-state error" role="alert">
            {error}
          </div>
        ) : null}

        {work ? (
          <article className="work-detail">
            <div className="work-gallery">
              {images.map((url) => (
                <img key={url} src={url || FALLBACK} alt="" />
              ))}
              {images.length === 0 ? <img src={FALLBACK} alt="" /> : null}
            </div>
            <div className="work-detail-body">
              <h2>{work.workTitle}</h2>
              <dl>
                <div>
                  <dt>拍摄风格</dt>
                  <dd>{styleLabel(work.styleType)}</dd>
                </div>
                <div>
                  <dt>拍摄地点</dt>
                  <dd>{work.shootLocation || "-"}</dd>
                </div>
                <div>
                  <dt>浏览次数</dt>
                  <dd>{work.viewCount ?? 0}</dd>
                </div>
              </dl>
              <p className="work-full-desc">{work.workDescription || "暂无描述"}</p>
              <div className="work-actions">
                <Link to={`/studio/works/${work.id}/edit`} className="work-edit-btn">
                  编辑
                </Link>
                <button
                  type="button"
                  className="work-delete-btn"
                  disabled={deleting}
                  onClick={() => void onDelete()}
                >
                  {deleting ? "删除中…" : "删除"}
                </button>
              </div>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}
