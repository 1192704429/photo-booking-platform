import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  deleteStudioPackage,
  fetchStudioPackage,
  formatPrice,
  isLoggedIn,
  STYLE_LABELS,
  stripHtml,
  type StudioPackage,
} from "../../api";
import "./packages.css";

function typeLabel(packageType?: number): string {
  if (packageType == null) return "未分类";
  return STYLE_LABELS[packageType] || "其他";
}

export function PackageDetailPage(): ReactNode {
  const { id } = useParams();
  const packageId = Number(id);
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<StudioPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(`/studio/packages/${id}`)}`, {
        replace: true,
      });
      return;
    }
    if (!Number.isFinite(packageId)) {
      setError("无效套餐");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioPackage(packageId)
      .then((data) => {
        if (!cancelled) setPkg(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(`/studio/packages/${id}`)}`, {
            replace: true,
          });
          return;
        }
        setError(err.message || "套餐加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, packageId]);

  async function onDelete() {
    if (!pkg) return;
    const confirmed = window.confirm(`确认删除套餐「${pkg.packageName}」吗？删除后不可恢复。`);
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStudioPackage(pkg.id);
      void navigate("/studio/packages", { replace: true });
    } catch (err) {
      setError((err as Error).message || "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="packages-page">
        <Link to="/studio/packages" className="pkg-back">
          ← 返回套餐列表
        </Link>
        <header className="pkg-header">
          <div>
            <p className="pkg-brand">约拍 · 工作室</p>
            <h1>套餐详情</h1>
            <p className="pkg-sub">查看完整套餐信息，支持编辑或删除</p>
          </div>
        </header>

        {loading ? <p className="pkg-state">加载中…</p> : null}
        {error ? (
          <div className="pkg-state error" role="alert">
            {error}
          </div>
        ) : null}

        {pkg ? (
          <article className={`pkg-detail${pkg.coverImage ? " has-cover" : ""}`}>
            {pkg.coverImage ? (
              <img className="pkg-cover" src={pkg.coverImage} alt="" />
            ) : null}
            <div className="pkg-detail-body">
              <div className="pkg-card-head">
                <h2>{pkg.packageName}</h2>
                <strong>{formatPrice(pkg.price)}</strong>
              </div>
              <dl className="pkg-meta detail">
                <div>
                  <dt>套餐类型</dt>
                  <dd>{typeLabel(pkg.packageType)}</dd>
                </div>
                <div>
                  <dt>拍摄时长</dt>
                  <dd>{pkg.shootDuration != null ? `${pkg.shootDuration} 分钟` : "-"}</dd>
                </div>
                <div>
                  <dt>精修张数</dt>
                  <dd>{pkg.retouchedCount != null ? `${pkg.retouchedCount} 张` : "-"}</dd>
                </div>
                <div>
                  <dt>原片数量</dt>
                  <dd>{pkg.originalCount != null ? `${pkg.originalCount} 张` : "-"}</dd>
                </div>
                <div>
                  <dt>适用人数</dt>
                  <dd>{pkg.applicablePeople != null ? `${pkg.applicablePeople} 人` : "-"}</dd>
                </div>
                <div>
                  <dt>拍摄地点</dt>
                  <dd>{pkg.shootLocation || "-"}</dd>
                </div>
                <div>
                  <dt>累计预约</dt>
                  <dd>{pkg.appointmentCount ?? 0} 次</dd>
                </div>
                <div>
                  <dt>上架状态</dt>
                  <dd>{pkg.status === 1 ? "上架" : "下架"}</dd>
                </div>
              </dl>
              <h3>套餐说明</h3>
              <p className="pkg-full-desc">
                {stripHtml(pkg.packageContent) || "暂无说明"}
              </p>
              {pkg.serviceNotice ? (
                <>
                  <h3>服务须知</h3>
                  <p className="pkg-full-desc">{pkg.serviceNotice}</p>
                </>
              ) : null}
              <div className="pkg-actions">
                <Link to={`/studio/packages/${pkg.id}/edit`} className="pkg-edit-btn">
                  编辑
                </Link>
                <button
                  type="button"
                  className="pkg-delete-btn"
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
