import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Select } from "antd";
import { Link, useNavigate } from "react-router";
import {
  fetchStudioWorks,
  isLoggedIn,
  STYLE_LABELS,
  type StudioWork,
} from "../../api";
import "./works.css";

const WORKS_PATH = "/studio/works";
const FALLBACK =
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(WORKS_PATH)}`;
}

function styleLabel(styleType?: number): string {
  if (styleType == null) return "风格未设";
  return STYLE_LABELS[styleType] || "其他";
}

export function WorksPage(): ReactNode {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [styleType, setStyleType] = useState<number | null>(null);
  const [list, setList] = useState<StudioWork[]>([]);
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
    void fetchStudioWorks({ keyword, styleType })
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
          setError("仅摄影师账号可管理作品");
          setList([]);
          return;
        }
        setError(err.message || "作品加载失败");
        setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, keyword, styleType]);

  const styleOptions = useMemo(
    () => Object.entries(STYLE_LABELS).map(([value, label]) => ({ value: Number(value), label })),
    [],
  );

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  }

  return (
    <div className="app-shell">
      <main className="works-page">
        <Link to="/overview" className="works-back">
          ← 返回数据概览
        </Link>
        <header className="works-header">
          <div>
            <p className="works-brand">约拍 · 工作室</p>
            <h1>作品管理</h1>
            <p className="works-sub">仅管理你自己的作品，保存后同步用户端展示</p>
          </div>
          <Link to="/studio/works/new" className="works-upload-btn">
            上传作品
          </Link>
        </header>

        <form className="works-filters" onSubmit={onSearch}>
          <label>
            作品标题
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索标题或地点"
            />
          </label>
          <label>
            拍摄风格
            <Select
              className="works-style-select"
              value={styleType ?? undefined}
              onChange={(value) => setStyleType(value ?? null)}
              options={styleOptions}
              placeholder="全部风格"
              allowClear
            />
          </label>
          <button type="submit">筛选</button>
        </form>

        {loading ? <p className="works-state">加载中…</p> : null}
        {error ? (
          <div className="works-state error" role="alert">
            {error}
          </div>
        ) : null}
        {!loading && !error && list.length === 0 ? (
          <div className="works-state empty">
            <p>暂无作品</p>
            <Link to="/studio/works/new">去上传第一组作品</Link>
          </div>
        ) : null}

        <section className="works-grid" aria-label="作品列表">
          {list.map((work) => (
            <Link key={work.id} className="work-card" to={`/studio/works/${work.id}`}>
              <img src={work.coverImage || FALLBACK} alt="" />
              <div className="work-card-body">
                <h2>{work.workTitle || "未命名作品"}</h2>
                <p>
                  <span>风格</span>
                  {styleLabel(work.styleType)}
                </p>
                <p>
                  <span>地点</span>
                  {work.shootLocation || "地点待完善"}
                </p>
                <p className="work-desc">
                  {work.workDescription || "暂无描述"}
                </p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
