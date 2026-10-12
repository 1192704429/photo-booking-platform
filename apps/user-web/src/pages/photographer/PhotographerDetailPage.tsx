import { ArrowLeftOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  fetchPhotographerDetail,
  formatPrice,
  formatScore,
  formatSpecialty,
  isLoggedIn,
  stripHtml,
  STYLE_LABELS,
  togglePhotographerFavorite,
  type OrderReview,
  type PhotographerDetail,
  type PhotographyPackage,
  type PhotographyWork,
} from "../../api";
import "./photographer.css";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";
const FALLBACK_WORK =
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80";

type SectionTab = "works" | "packages" | "reviews";

export function PhotographerDetailPage(): ReactNode {
  const { id } = useParams();
  const navigate = useNavigate();
  const photographerId = Number(id);
  const [detail, setDetail] = useState<PhotographerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriting, setFavoriting] = useState(false);
  const [section, setSection] = useState<SectionTab>("works");
  const [workStyle, setWorkStyle] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(photographerId)) {
      setError("无效的摄影师");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPhotographerDetail(photographerId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photographerId]);

  const photographer = detail?.photographer;
  const works = detail?.works ?? [];
  const packages = detail?.packages ?? [];
  const reviews = detail?.reviews ?? [];

  const workStyles = useMemo(() => {
    const set = new Set<number>();
    works.forEach((work) => {
      if (work.styleType != null) set.add(work.styleType);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [works]);

  const filteredWorks = useMemo(() => {
    if (workStyle == null) return works;
    return works.filter((work) => work.styleType === workStyle);
  }, [works, workStyle]);

  async function onFavorite() {
    if (!isLoggedIn()) {
      const redirect = encodeURIComponent(`/photographer/${photographerId}`);
      void navigate(`/login?redirect=${redirect}`);
      return;
    }
    setFavoriting(true);
    try {
      const favorited = await togglePhotographerFavorite(photographerId);
      setDetail((prev) => (prev ? { ...prev, favorited } : prev));
    } catch (err) {
      const error = err as Error & { code?: number };
      if (error.code === 401) {
        const redirect = encodeURIComponent(`/photographer/${photographerId}`);
        void navigate(`/login?redirect=${redirect}`);
      } else {
        setError(error.message || "收藏失败");
      }
    } finally {
      setFavoriting(false);
    }
  }

  return (
      <main className="detail-page">
        <Link to="/photographers" className="detail-back">
          <ArrowLeftOutlined aria-hidden="true" />
          <span>返回摄影师列表</span>
        </Link>

        {loading ? <p className="detail-state">加载中…</p> : null}
        {error ? <p className="detail-state error">{error}</p> : null}

        {photographer ? (
          <>
            <section className="detail-hero">
              <img
                className="detail-cover"
                src={photographer.homepageCover || photographer.avatar || FALLBACK_AVATAR}
                alt=""
              />
              <div className="detail-profile">
                <div className="detail-title-row">
                  <img
                    className="detail-avatar"
                    src={photographer.avatar || FALLBACK_AVATAR}
                    alt=""
                  />
                  <div className="detail-title-text">
                    <h1>{photographer.nickname || "摄影师"}</h1>
                    <p className="detail-score">{formatScore(photographer.averageScore)} 分</p>
                  </div>
                  <button
                    type="button"
                    className={detail?.favorited ? "favorite-btn active" : "favorite-btn"}
                    onClick={() => void onFavorite()}
                    disabled={favoriting}
                  >
                    {detail?.favorited ? "已收藏" : "收藏"}
                  </button>
                </div>

                <div className="detail-stats" aria-label="摄影师概览">
                  <div><strong>{works.length}</strong><span>作品</span></div>
                  <div><strong>{packages.length}</strong><span>套餐</span></div>
                  <div><strong>{photographer.appointmentCount ?? 0}</strong><span>累计约拍</span></div>
                </div>

                <p className="detail-line">
                  <strong>服务城市</strong>
                  {photographer.serviceCity || photographer.city || "待完善"}
                </p>
                <p className="detail-line">
                  <strong>擅长风格</strong>
                  {formatSpecialty(photographer.specialtyStyle)}
                </p>
                <p className="detail-line">
                  <strong>从业年限</strong>
                  {photographer.workYears != null && photographer.workYears > 0
                    ? `${photographer.workYears} 年`
                    : "待完善"}
                </p>
                {photographer.personalIntro ? (
                  <p className="detail-intro">{photographer.personalIntro}</p>
                ) : (
                  <p className="detail-intro muted">暂无个人介绍</p>
                )}
              </div>
            </section>

            <div className="detail-tabs" role="tablist" aria-label="详情分区">
              <button
                type="button"
                className={section === "works" ? "active" : ""}
                onClick={() => setSection("works")}
              >
                作品集 ({works.length})
              </button>
              <button
                type="button"
                className={section === "packages" ? "active" : ""}
                onClick={() => setSection("packages")}
              >
                套餐 ({packages.length})
              </button>
              <button
                type="button"
                className={section === "reviews" ? "active" : ""}
                onClick={() => setSection("reviews")}
              >
                评价 ({reviews.length})
              </button>
            </div>

            {section === "works" ? (
              <WorksSection
                styles={workStyles}
                activeStyle={workStyle}
                onStyleChange={setWorkStyle}
                works={filteredWorks}
              />
            ) : null}
            {section === "packages" ? (
              <PackagesSection
                packages={packages}
                photographerId={photographerId}
              />
            ) : null}
            {section === "reviews" ? <ReviewsSection reviews={reviews} /> : null}
          </>
        ) : null}
      </main>
  );
}

function WorksSection({
  styles,
  activeStyle,
  onStyleChange,
  works,
}: {
  styles: number[];
  activeStyle: number | null;
  onStyleChange: (value: number | null) => void;
  works: PhotographyWork[];
}) {
  return (
            <section className="detail-section" aria-label="作品集">
      <div className="work-style-row">
        <button
          type="button"
          className={activeStyle == null ? "chip active" : "chip"}
          onClick={() => onStyleChange(null)}
        >
          全部
        </button>
        {styles.map((style) => (
          <button
            key={style}
            type="button"
            className={activeStyle === style ? "chip active" : "chip"}
            onClick={() => onStyleChange(style)}
          >
            {STYLE_LABELS[style] ?? `风格${style}`}
          </button>
        ))}
      </div>
      <div className="work-list">
        {works.map((work) => (
          <Link key={work.id} className="work-item" to={`/photographer/${work.photographerId}/work/${work.id}`}>
            <img src={work.coverImage || FALLBACK_WORK} alt="" />
            <div>
              <h3>{work.workTitle}</h3>
              <p className="meta">
                {work.styleType != null ? STYLE_LABELS[work.styleType] : "作品"}
                {work.shootLocation ? ` · ${work.shootLocation}` : ""}
              </p>
              {work.workDescription ? <p className="desc">{work.workDescription}</p> : null}
            </div>
          </Link>
        ))}
        {works.length === 0 ? <div className="detail-state">暂无作品</div> : null}
      </div>
    </section>
  );
}

function PackagesSection({
  packages,
  photographerId,
}: {
  packages: PhotographyPackage[];
  photographerId: number;
}) {
  return (
    <section className="detail-section" aria-label="摄影套餐">
      <div className="package-list">
        {packages.map((item) => (
          <article key={item.id} className="package-item">
            {item.coverImage ? <img src={item.coverImage} alt="" className="package-cover" /> : null}
            <div className="package-body">
              <div className="package-title-row">
                <h3>{item.packageName}</h3>
                <strong>{formatPrice(item.price)}</strong>
              </div>
              <ul>
                <li>拍摄时长：{item.shootDuration != null ? `${item.shootDuration} 分钟` : "面议"}</li>
                <li>精修张数：{item.retouchedCount ?? "-"}</li>
                <li>原片数量：{item.originalCount ?? "-"}</li>
                <li>拍摄地点：{item.shootLocation || "面议"}</li>
                <li>适用人数：{item.applicablePeople != null ? `${item.applicablePeople} 人` : "面议"}</li>
              </ul>
              {item.packageContent ? (
                <p className="package-desc">{stripHtml(item.packageContent)}</p>
              ) : null}
              <Link
                className="book-btn"
                to={`/appointment/submit?photographerId=${photographerId}&packageId=${item.id}`}
              >
                立即预约
              </Link>
            </div>
          </article>
        ))}
        {packages.length === 0 ? <div className="detail-state">暂无上架套餐</div> : null}
      </div>
    </section>
  );
}

function ReviewsSection({ reviews }: { reviews: OrderReview[] }) {
  return (
    <section className="detail-section" aria-label="用户评价">
      <div className="review-list">
        {reviews.map((review) => (
          <article key={review.id} className="review-item">
            <div className="review-head">
              <strong>{review.nickname || "用户"}</strong>
              <span>{formatScore(review.score)} 分</span>
            </div>
            <p>{review.reviewContent || "暂无评价内容"}</p>
            {review.reviewImages ? (
              <div className="review-images" aria-label="评价图片">
                {review.reviewImages.split(/[,，]/).map((url, index) => {
                  const imageUrl = url.trim();
                  return imageUrl ? (
                    <a key={`${imageUrl}-${index}`} href={imageUrl} target="_blank" rel="noreferrer">
                      <img src={imageUrl} alt={`评价图片 ${index + 1}`} loading="lazy" />
                    </a>
                  ) : null;
                })}
              </div>
            ) : null}
            {review.replyContent ? <div className="review-reply"><strong>摄影师回复</strong><span>{review.replyContent}</span></div> : null}
            {review.createTime ? <time>{review.createTime}</time> : null}
          </article>
        ))}
        {reviews.length === 0 ? <div className="detail-state">暂无评价</div> : null}
      </div>
    </section>
  );
}
