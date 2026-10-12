import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Select } from "antd";
import { Link, useNavigate } from "react-router";
import {
  fetchStudioReviews,
  isLoggedIn,
  type StudioReviewItem,
  type StudioReviewsData,
} from "../../api";
import "./studio-reviews.css";

const PATH = "/studio/reviews";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(PATH)}`;
}

function formatScore(value: number | string | undefined): string {
  if (value == null || value === "") return "0.0";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

function formatDateTime(value?: string): string {
  return value ? String(value).slice(0, 16) : "";
}

function splitImages(raw?: string): string[] {
  return String(raw ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function starText(score?: number | string): string {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return "☆☆☆☆☆";
  const filled = Math.max(0, Math.min(5, Math.round(n)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function StudioReviewsPage(): ReactNode {
  const navigate = useNavigate();
  const [score, setScore] = useState<number | "">("");
  const [anonymousStatus, setAnonymousStatus] = useState<number | "">("");
  const [appliedScore, setAppliedScore] = useState<number | null>(null);
  const [appliedAnonymous, setAppliedAnonymous] = useState<number | null>(null);
  const [data, setData] = useState<StudioReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioReviews({
      score: appliedScore,
      anonymousStatus: appliedAnonymous,
    })
      .then((page) => {
        if (!cancelled) setData(page);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可查看用户评价");
          setData(null);
          return;
        }
        setError(err.message || "评价加载失败");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, appliedScore, appliedAnonymous]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setAppliedScore(score === "" ? null : Number(score));
    setAppliedAnonymous(anonymousStatus === "" ? null : Number(anonymousStatus));
  }

  const reviews = data?.reviews ?? [];

  return (
    <div className="app-shell">
      <main className="studio-reviews-page">
        <Link to="/overview" className="sr-back">
          ← 返回概览
        </Link>

        <header className="sr-header">
          <div>
            <p className="sr-brand">User Reviews</p>
            <h1>用户评价</h1>
            <p className="sr-sub">查看你收到的约拍评价，仅支持浏览不可修改</p>
          </div>
        </header>

        <section className="sr-summary" aria-label="综合评分">
          <div>
            <p className="sr-summary-label">综合评分</p>
            <p className="sr-summary-score">{formatScore(data?.averageScore)}</p>
            <p className="sr-summary-stars">{starText(data?.averageScore)}</p>
          </div>
          <div className="sr-summary-count">
            <strong>{data?.reviewCount ?? 0}</strong>
            <span>条评价</span>
          </div>
        </section>

        <form className="sr-filters" onSubmit={onFilter}>
          <label>
            评分
            <Select
              value={score === "" ? undefined : score}
              onChange={(value) => setScore(value ?? "")}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} 星` }))}
              placeholder="全部星级"
              allowClear
            />
          </label>
          <label>
            是否匿名
            <Select
              value={anonymousStatus === "" ? undefined : anonymousStatus}
              onChange={(value) => setAnonymousStatus(value ?? "")}
              options={[{ value: 0, label: "实名" }, { value: 1, label: "匿名" }]}
              placeholder="全部"
              allowClear
            />
          </label>
          <button type="submit">筛选</button>
        </form>

        {loading ? <p className="sr-state">加载中…</p> : null}
        {error ? (
          <p className="sr-state error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && reviews.length === 0 ? (
          <p className="sr-state">暂无符合条件的评价</p>
        ) : null}

        <section className="sr-list" aria-label="评价列表">
          {reviews.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </section>
      </main>
    </div>
  );
}

function ReviewCard({ item }: { item: StudioReviewItem }): ReactNode {
  const images = splitImages(item.reviewImages);
  return (
    <article className="sr-card">
      <header className="sr-card-head">
        <div>
          <strong>{item.userName || "用户"}</strong>
          <span className="sr-anon">{item.anonymous ? "匿名评价" : "实名评价"}</span>
        </div>
        <time>{formatDateTime(item.createTime)}</time>
      </header>
      <p className="sr-stars" aria-label={`评分 ${formatScore(item.score)}`}>
        <em>{starText(item.score)}</em>
        <span>{formatScore(item.score)}</span>
      </p>
      <p className="sr-content">{item.reviewContent || "（无文字评价）"}</p>
      {images.length > 0 ? (
        <div className="sr-images" aria-label="返图">
          {images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="" />
            </a>
          ))}
        </div>
      ) : (
        <p className="sr-no-image">未上传返图</p>
      )}
      <footer className="sr-card-foot">
        <span>订单 {item.orderNo || item.orderId || "-"}</span>
        {item.orderId ? (
          <Link to={`/studio/orders/${item.orderId}`}>查看订单</Link>
        ) : null}
      </footer>
    </article>
  );
}
