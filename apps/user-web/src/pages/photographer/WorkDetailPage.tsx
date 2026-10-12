import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { fetchPhotographerDetail, formatSpecialty, STYLE_LABELS, type PhotographyWork } from "../../api";
import "./work-detail.css";

const FALLBACK_WORK = "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=85";

export function WorkDetailPage(): ReactNode {
  const { photographerId, workId } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState<PhotographyWork | null>(null);
  const [photographerName, setPhotographerName] = useState("摄影师");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const photographer = Number(photographerId);
    const target = Number(workId);
    if (!Number.isFinite(photographer) || !Number.isFinite(target)) {
      setError("作品不存在");
      return;
    }
    void fetchPhotographerDetail(photographer)
      .then((data) => {
        setPhotographerName(data.photographer.nickname || "摄影师");
        const matched = data.works.find((item) => item.id === target);
        if (!matched) setError("作品不存在或暂未公开");
        else setWork(matched);
      })
      .catch((err: Error) => setError(err.message || "作品加载失败"));
  }, [photographerId, workId]);

  if (error) {
    return <main className="public-work-page"><div className="public-work-state">{error}<Link to={`/photographer/${photographerId || ""}`}>返回摄影师主页</Link></div></main>;
  }
  if (!work) return <main className="public-work-page"><div className="public-work-state">加载中…</div></main>;

  const images = String(work.workImages || work.coverImage || "")
    .split(/[,，]/).map((url) => url.trim()).filter(Boolean);
  const gallery = images.length ? images : [FALLBACK_WORK];
  return (
    <main className="public-work-page">
      <Link to={`/photographer/${photographerId}#works`} className="public-work-back"><ArrowLeftOutlined /> 返回摄影师主页</Link>
      <header className="public-work-header">
        <div>
          <p>作品灵感 · {photographerName}</p>
          <h1>{work.workTitle || "摄影作品"}</h1>
          <span>{work.styleType != null ? STYLE_LABELS[work.styleType] : "作品"}{work.shootLocation ? ` · ${work.shootLocation}` : ""}</span>
        </div>
        <Link to={`/photographer/${photographerId}#works`} className="public-work-photographer">查看摄影师主页</Link>
      </header>
      <section className="public-work-hero">
        <img src={gallery[0]} alt={work.workTitle || "摄影作品"} />
        <div><strong>作品故事</strong><p>{work.workDescription || "摄影师暂未补充作品说明。"}</p></div>
      </section>
      {gallery.length > 1 ? <section className="public-work-gallery" aria-label="作品图片">{gallery.slice(1).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${work.workTitle} ${index + 2}`} loading="lazy" />)}</section> : null}
    </main>
  );
}
