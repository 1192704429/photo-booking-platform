import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Pagination } from "antd";
import { Link, useNavigate } from "react-router";
import {
  fetchStudioPackages,
  formatPrice,
  isLoggedIn,
  stripHtml,
  type StudioPackage,
} from "../../api";
import "./packages.css";

const PACKAGES_PATH = "/studio/packages";
const PAGE_SIZE = 6;

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(PACKAGES_PATH)}`;
}

export function PackagesPage(): ReactNode {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [list, setList] = useState<StudioPackage[]>([]);
  const [page, setPage] = useState(1);
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
    void fetchStudioPackages(keyword)
      .then((data) => {
        if (!cancelled) setList(data ?? []);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可管理套餐");
          setList([]);
          return;
        }
        setError(err.message || "套餐加载失败");
        setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, keyword]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const visibleList = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setKeyword(keywordInput.trim());
  }

  return (
    <div className="app-shell">
      <main className="packages-page">
        <Link to="/overview" className="pkg-back">
          ← 返回数据概览
        </Link>
        <header className="pkg-header">
          <div>
            <p className="pkg-brand">约拍 · 工作室</p>
            <h1>摄影套餐</h1>
            <p className="pkg-sub">仅管理你发布的套餐，保存后同步用户端展示</p>
          </div>
          <Link to="/studio/packages/new" className="pkg-publish-btn">
            发布套餐
          </Link>
        </header>

        <form className="pkg-filters" onSubmit={onSearch}>
          <label>
            套餐名称
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索套餐名称或地点"
            />
          </label>
          <button type="submit">搜索</button>
        </form>

        {loading ? <p className="pkg-state">加载中…</p> : null}
        {error ? (
          <div className="pkg-state error" role="alert">
            {error}
          </div>
        ) : null}
        {!loading && !error && list.length === 0 ? (
          <div className="pkg-state empty">
            <p>暂无套餐</p>
            <Link to="/studio/packages/new">去发布第一个套餐</Link>
          </div>
        ) : null}

        <section className="pkg-list" aria-label="套餐列表">
          {visibleList.map((item) => (
            <Link key={item.id} className="pkg-card" to={`/studio/packages/${item.id}`}>
              <div className="pkg-card-cover">
                {item.coverImage ? <img src={item.coverImage} alt="" /> : <span>PACKAGE</span>}
              </div>
              <div className="pkg-card-content">
                <div className="pkg-card-head">
                  <h2>{item.packageName || "未命名套餐"}</h2>
                  <strong>{formatPrice(item.price)}</strong>
                </div>
                <dl className="pkg-meta">
                  <div><dt>时长</dt><dd>{item.shootDuration != null ? `${item.shootDuration} 分钟` : "-"}</dd></div>
                  <div><dt>精修</dt><dd>{item.retouchedCount != null ? `${item.retouchedCount} 张` : "-"}</dd></div>
                  <div><dt>原片</dt><dd>{item.originalCount != null ? `${item.originalCount} 张` : "-"}</dd></div>
                  <div><dt>人数</dt><dd>{item.applicablePeople != null ? `${item.applicablePeople} 人` : "-"}</dd></div>
                  <div className="pkg-meta-location"><dt>地点</dt><dd>{item.shootLocation || "-"}</dd></div>
                </dl>
                <p className="pkg-desc">{stripHtml(item.packageContent) || "暂无套餐说明"}</p>
              </div>
            </Link>
          ))}
        </section>
        {!loading && !error && list.length > PAGE_SIZE ? (
          <div className="pkg-pagination">
            <Pagination
              current={Math.min(page, totalPages)}
              pageSize={PAGE_SIZE}
              total={list.length}
              showSizeChanger={false}
              showQuickJumper={false}
              showTotal={(total) => `共 ${total} 个套餐`}
              onChange={setPage}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
