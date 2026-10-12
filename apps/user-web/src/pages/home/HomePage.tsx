import { StarFilled } from "@ant-design/icons";
import { Avatar, Button, Card, Empty, Spin, Tag, Typography } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  fetchHomeFeed,
  formatScore,
  formatSpecialty,
  STYLE_LABELS,
  type HomeFeed,
  type HomeTheme,
  type Photographer,
  type PhotographyWork,
} from "../../api";
import "./home.css";

const { Title, Paragraph, Text } = Typography;

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";
const FALLBACK_WORK =
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80";

export function HomePage(): ReactNode {
  const [styleType, setStyleType] = useState<number | null>(null);
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const [themeAutoPlay, setThemeAutoPlay] = useState(true);
  const [themeInteractionPaused, setThemeInteractionPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchHomeFeed(styleType)
      .then((data) => {
        if (cancelled) return;
        setFeed(data);
        setThemeIndex(0);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [styleType]);

  useEffect(() => {
    const themes = feed?.themes ?? [];
    if (themes.length <= 1 || !themeAutoPlay || themeInteractionPaused) return;
    const timer = window.setInterval(() => {
      setThemeIndex((prev) => (prev + 1) % themes.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [feed?.themes, themeAutoPlay, themeInteractionPaused]);

  const themes = feed?.themes ?? [];
  const activeTheme = themes[themeIndex] ?? themes[0];
  const styles =
    feed?.styles ??
    Object.entries(STYLE_LABELS).map(([value, label]) => ({
      value: Number(value),
      label,
    }));

  return (
    <main className="home-page">
      <header className="home-top">
        <div>
          <Title level={3} className="home-headline">
            发现适合你的摄影师
          </Title>
          <Text type="secondary">从作品和风格出发，完成一次轻松的约拍</Text>
        </div>
        <Tag color={feed?.personalized ? "gold" : "cyan"}>
          {feed?.personalized ? "为你推荐" : "通用精选"}
        </Tag>
      </header>

      <section
        className="theme-section"
        aria-label="约拍主题"
        onMouseEnter={() => setThemeInteractionPaused(true)}
        onMouseLeave={() => setThemeInteractionPaused(false)}
        onFocusCapture={() => setThemeInteractionPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setThemeInteractionPaused(false);
          }
        }}
      >
        <div className="desktop-hero-layout">
          {activeTheme ? (
            <ThemeHero theme={activeTheme} onSelectStyle={(value) => setStyleType(value)} />
          ) : (
            <div className="theme-hero skeleton" />
          )}
          <aside className="quick-booking" aria-label="快速查找摄影师">
            <p className="quick-booking-kicker">快速预约</p>
            <h2>找到合适的摄影师</h2>
            <p>按拍摄风格浏览已入驻的摄影师和作品。</p>
            <div className="quick-style-list">
              {styles.slice(0, 4).map((style) => (
                <button
                  key={style.value}
                  type="button"
                  className={styleType === style.value ? "quick-style active" : "quick-style"}
                  onClick={() => setStyleType(style.value)}
                >
                  {shortStyleLabel(style.label)}
                </button>
              ))}
            </div>
            <Link to="/photographers" className="quick-booking-action">
              查看全部摄影师
            </Link>
          </aside>
        </div>
        {themes.length > 1 ? (
          <div className="theme-dots" role="tablist" aria-label="主题切换">
            {themes.map((theme, index) => (
              <button
                key={theme.title}
                type="button"
                className={index === themeIndex ? "dot active" : "dot"}
                aria-label={theme.title}
                aria-selected={index === themeIndex}
                onClick={() => setThemeIndex(index)}
              />
            ))}
            <button
              type="button"
              className="theme-pause"
              aria-label={themeAutoPlay ? "暂停自动切换主题" : "继续自动切换主题"}
              aria-pressed={!themeAutoPlay}
              onClick={() => setThemeAutoPlay((playing) => !playing)}
            >
              {themeAutoPlay ? "暂停" : "播放"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="home-section" aria-label="摄影风格">
        <div className="section-head">
          <Title level={4}>摄影风格</Title>
          <Paragraph type="secondary">点选后筛选摄影师与作品</Paragraph>
        </div>
        <div className="style-row">
          <Button
            type={styleType == null ? "primary" : "default"}
            shape="round"
            onClick={() => setStyleType(null)}
          >
            全部
          </Button>
          {styles.map((style) => (
            <Button
              key={style.value}
              type={styleType === style.value ? "primary" : "default"}
              shape="round"
              onClick={() => setStyleType(style.value)}
            >
              {shortStyleLabel(style.label)}
            </Button>
          ))}
        </div>
      </section>

      {error ? (
        <Card size="small" className="home-alert">
          <Text type="danger">{error}</Text>
        </Card>
      ) : null}

      <Spin spinning={loading && !feed}>
        <section className="home-section" aria-label="推荐摄影师">
          <div className="section-head">
            <Title level={4}>推荐摄影师</Title>
            <Paragraph type="secondary">
              {styleType == null ? "口碑与档期兼备" : `${STYLE_LABELS[styleType] ?? "该风格"}擅长者`}
            </Paragraph>
          </div>
          <div className="photographer-list">
            {(feed?.photographers ?? []).map((item) => (
              <PhotographerCard key={item.id} photographer={item} />
            ))}
            {!loading && (feed?.photographers?.length ?? 0) === 0 ? (
              <Empty description="暂无匹配摄影师" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        </section>

        <section id="works" className="home-section" aria-label="推荐作品">
          <div className="section-head">
            <Title level={4}>推荐作品</Title>
            <Paragraph type="secondary">精选 {feed?.works?.length ?? 0} 组 · 看看别人怎么拍</Paragraph>
          </div>
          <div className="work-grid">
            {(feed?.works ?? []).map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
            {!loading && (feed?.works?.length ?? 0) === 0 ? (
              <Empty description="暂无推荐作品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        </section>
      </Spin>
    </main>
  );
}

function shortStyleLabel(label: string): string {
  if (label === "个人写真") return "写真";
  if (label === "情侣写真") return "情侣";
  if (label === "古风写真") return "古风";
  if (label === "毕业写真") return "毕业";
  if (label === "婚礼跟拍") return "婚礼";
  if (label === "商业摄影") return "商业";
  return label;
}

function ThemeHero({
  theme,
  onSelectStyle,
}: {
  theme: HomeTheme;
  onSelectStyle: (styleType: number) => void;
}) {
  return (
    <article className="theme-hero">
      <img src={theme.coverImage} alt="" className="theme-cover" />
      <div className="theme-mask" />
      <div className="theme-copy">
        <p className="theme-kicker">约拍主题</p>
        <h2>{theme.title}</h2>
        <p>{theme.subtitle}</p>
        <Button type="default" shape="round" onClick={() => onSelectStyle(theme.styleType)}>
          {theme.actionLabel}
        </Button>
      </div>
    </article>
  );
}

function PhotographerCard({ photographer }: { photographer: Photographer }) {
  const city = photographer.serviceCity || photographer.city || "城市待完善";
  return (
    <Link to={`/photographer/${photographer.id}`} className="photographer-card-link">
      <Card
        className="photographer-card"
        hoverable
        size="small"
        cover={
          <div className="photographer-cover-wrap">
            <img
              src={photographer.homepageCover || photographer.avatar || FALLBACK_WORK}
              alt={`${photographer.nickname || "摄影师"}的作品`}
              className="photographer-cover"
              loading="lazy"
            />
            <span className="photographer-city">{city}</span>
          </div>
        }
      >
        <div className="photographer-card-inner">
          <Avatar size={48} src={photographer.avatar || FALLBACK_AVATAR} shape="square" />
          <div className="photographer-body">
            <div className="photographer-title-row">
              <Text strong>{photographer.nickname || "摄影师"}</Text>
              <Text className="score"><StarFilled aria-hidden="true" /> {formatScore(photographer.averageScore)}</Text>
            </div>
            <Paragraph type="secondary" ellipsis className="photographer-meta">
              {formatSpecialty(photographer.specialtyStyle)}
            </Paragraph>
            <Text type="secondary">查看作品集与可预约服务</Text>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function WorkCard({ work }: { work: PhotographyWork }) {
  const styleLabel = work.styleType != null ? STYLE_LABELS[work.styleType] : "作品";
  return (
    <Link
      to={`/photographer/${work.photographerId}/work/${work.id}`}
      className="work-card-link"
      aria-label={`查看${work.workTitle}作品详情`}
    >
      <Card
        className="work-card"
        hoverable
        cover={
          <div className="work-cover-wrap">
            <img
              src={work.coverImage || FALLBACK_WORK}
              alt={work.workTitle || "摄影作品"}
              className="work-cover"
              loading="lazy"
            />
            <Tag className="work-style">{styleLabel}</Tag>
          </div>
        }
      >
        <Card.Meta
          title={work.workTitle}
          description={`${work.nickname || "摄影师"}${work.shootLocation ? ` · ${work.shootLocation}` : ""}`}
        />
      </Card>
    </Link>
  );
}
