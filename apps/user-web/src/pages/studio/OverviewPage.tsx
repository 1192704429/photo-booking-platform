import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchCurrentUser,
  fetchPhotographerOverview,
  getCachedNickname,
  isLoggedIn,
  isPhotographer,
  type ChartPoint,
  type PhotographerOverview,
} from "../../api";
import "./overview.css";

const OVERVIEW_PATH = "/overview";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(OVERVIEW_PATH)}`;
}

function toNumber(value: number | string | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatScore(value: number | string | undefined): string {
  const n = toNumber(value);
  return n.toFixed(1);
}

export function OverviewPage(): ReactNode {
  const navigate = useNavigate();
  const [data, setData] = useState<PhotographerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studioName, setStudioName] = useState(getCachedNickname() || "摄影师工作室");

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        if (!isPhotographer()) {
          const profile = await fetchCurrentUser();
          if (profile.roleType !== "photographer") {
            setError("仅摄影师账号可查看数据概览");
            setLoading(false);
            return;
          }
          if (profile.nickname) setStudioName(profile.nickname);
        }
        const overview = await fetchPhotographerOverview();
        if (!cancelled) setData(overview);
      } catch (err) {
        if (cancelled) return;
        const error = err as Error & { code?: number };
        if (error.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (error.code === 403) {
          setError("仅摄影师账号可查看数据概览");
          return;
        }
        setError(error.message || "数据加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}年${now.getMonth() + 1}月`;
  }, []);

  return (
    <div className="app-shell">
      <main className="overview-page">
        <header className="overview-header">
          <div>
            <p className="overview-brand">约拍 · 工作室</p>
            <h1>数据概览</h1>
            <p className="overview-sub">
              {studioName} · {monthLabel}经营数据（仅本人）
            </p>
          </div>
          <Link to="/studio/profile" className="overview-mine-link">
            编辑工作室资料
          </Link>
        </header>

        {loading ? <p className="overview-state">加载中…</p> : null}
        {error ? (
          <div className="overview-state error" role="alert">
            {error}
            {error.includes("摄影师") ? (
              <Link to="/" className="overview-fallback">
                返回用户首页
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && data ? (
          <>
            <section className="overview-stats" aria-label="核心指标">
              <article className="stat-card">
                <p className="stat-label">本月预约</p>
                <p className="stat-value">{data.monthAppointmentCount ?? 0}</p>
                <p className="stat-hint">预约申请数</p>
              </article>
              <article className="stat-card accent">
                <p className="stat-label">本月完成</p>
                <p className="stat-value">{data.monthCompletedOrderCount ?? 0}</p>
                <p className="stat-hint">已完成订单</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">用户评分</p>
                <p className="stat-value">{formatScore(data.averageScore)}</p>
                <p className="stat-hint">
                  {data.reviewCount != null && data.reviewCount > 0
                    ? `${data.reviewCount} 条评价`
                    : "综合评分"}
                </p>
              </article>
            </section>

            <section className="overview-actions" aria-label="常用功能">
              <header>
                <div>
                  <h2>常用功能</h2>
                  <p>快速发布内容或处理近期业务</p>
                </div>
              </header>
              <div className="overview-action-grid">
                <Link to="/studio/works/new"><strong>发布作品</strong><span>上传作品集与拍摄案例</span><i>→</i></Link>
                <Link to="/studio/packages/new"><strong>新建套餐</strong><span>配置价格与服务内容</span><i>→</i></Link>
                <Link to="/studio/schedules"><strong>维护档期</strong><span>设置可预约日期与时段</span><i>→</i></Link>
                <Link to="/studio/orders"><strong>处理订单</strong><span>查看预约申请与交付进度</span><i>→</i></Link>
              </div>
            </section>

            <section className="overview-charts" aria-label="经营图表">
              <article className="chart-panel">
                <header>
                  <h2>月度约拍趋势</h2>
                  <p>近 6 个月预约申请量</p>
                </header>
                <TrendChart points={data.monthlyTrend ?? []} />
              </article>

              <article className="chart-panel">
                <header>
                  <h2>热门套餐</h2>
                  <p>按预约热度 Top 5</p>
                </header>
                <PackageChart points={data.popularPackages ?? []} />
              </article>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function TrendChart({ points }: { points: ChartPoint[] }): ReactNode {
  const values = points.map((item) => toNumber(item.value));
  const max = Math.max(...values, 1);
  const axisMax = Math.max(4, Math.ceil(max / 4) * 4);
  const width = 640;
  const height = 250;
  const padLeft = 46;
  const padRight = 22;
  const padTop = 28;
  const padBottom = 38;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const step = points.length > 1 ? chartW / (points.length - 1) : 0;
  const coordinates = points.map((item, index) => ({
    x: points.length > 1 ? padLeft + index * step : padLeft + chartW / 2,
    y: padTop + chartH - (toNumber(item.value) / axisMax) * chartH,
    value: toNumber(item.value),
    label: String(item.name).slice(5).replace(/^0/, ""),
  }));
  const linePath = coordinates.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = coordinates[index - 1];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${padTop + chartH} L ${coordinates[0].x} ${padTop + chartH} Z`
    : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  if (points.length === 0) {
    return <p className="chart-empty">暂无趋势数据</p>;
  }

  return (
    <div className="chart-wrap trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="月度约拍趋势图">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37 99 106 / 24%)" />
            <stop offset="100%" stopColor="rgb(37 99 106 / 2%)" />
          </linearGradient>
          <filter id="trendShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#25636a" floodOpacity=".16" />
          </filter>
        </defs>
        {ticks.map((ratio) => {
          const y = padTop + chartH * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} className="trend-grid-line" />
              <text x={padLeft - 12} y={y + 4} textAnchor="end" className="trend-y-label">
                {Math.round(axisMax * ratio)}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} className="trend-line" filter="url(#trendShadow)" />
        {coordinates.map((point, index) => {
          return (
            <g key={points[index].name} className="trend-point">
              <circle cx={point.x} cy={point.y} r="7" className="trend-point-halo" />
              <circle cx={point.x} cy={point.y} r="4" className="trend-point-dot" />
              <text x={point.x} y={height - 10} textAnchor="middle" className="chart-axis">
                {point.label}月
              </text>
              <text x={point.x} y={point.y - 13} textAnchor="middle" className="chart-value">
                {point.value}
              </text>
              <title>{`${point.label}月：${point.value} 次预约`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PackageChart({ points }: { points: ChartPoint[] }): ReactNode {
  const values = points.map((item) => toNumber(item.value));
  const max = Math.max(...values, 1);

  if (points.length === 0) {
    return <p className="chart-empty">暂无套餐数据</p>;
  }

  return (
    <ul className="package-bars">
      {points.map((item) => {
        const value = toNumber(item.value);
        const width = `${Math.max(8, (value / max) * 100)}%`;
        return (
          <li key={item.name}>
            <div className="package-meta">
              <strong>{item.name}</strong>
              <span>{value} 次</span>
            </div>
            <div className="package-track">
              <div className="package-fill" style={{ width }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
