import { SearchOutlined, StarFilled } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Pagination,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  fetchPhotographerMeta,
  fetchPhotographerPage,
  formatScore,
  formatSpecialty,
  type Photographer,
  type PhotographerMeta,
} from "../../api";
import "./list.css";

const { Title, Paragraph, Text } = Typography;

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

export function PhotographerListPage(): ReactNode {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [serviceCity, setServiceCity] = useState<string | undefined>();
  const [styleType, setStyleType] = useState<number | undefined>();
  const [meta, setMeta] = useState<PhotographerMeta | null>(null);
  const [list, setList] = useState<Photographer[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 6;

  useEffect(() => {
    let cancelled = false;
    void fetchPhotographerMeta()
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) {
          setMeta({
            cities: [],
            styles: [
              { value: 1, label: "个人写真" },
              { value: 2, label: "情侣写真" },
              { value: 3, label: "毕业写真" },
              { value: 4, label: "古风写真" },
              { value: 5, label: "旅拍" },
              { value: 6, label: "婚礼跟拍" },
              { value: 7, label: "商业摄影" },
              { value: 8, label: "其他" },
            ],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPhotographerPage({
      current,
      size: pageSize,
      keyword,
      serviceCity,
      styleType: styleType ?? null,
    })
      .then((page) => {
        if (cancelled) return;
        setList(page.records ?? []);
        setTotal(Number(page.total) || 0);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "加载失败");
        setList([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [current, keyword, serviceCity, styleType]);

  function submitSearch() {
    setCurrent(1);
    setKeyword(keywordInput.trim());
  }

  function resetFilters() {
    setKeywordInput("");
    setKeyword("");
    setServiceCity(undefined);
    setStyleType(undefined);
    setCurrent(1);
  }

  return (
    <main className="photographer-page">
      <header className="photographer-header">
        <Title level={3}>摄影师</Title>
        <Paragraph type="secondary">按城市与风格，找到适合你的镜头</Paragraph>
      </header>

      <div className="photographer-desktop-layout">
        <div className="photographer-results">
          <div className="photographer-toolbar">
            <Input
              className="photographer-search"
              allowClear value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onPressEnter={submitSearch}
              placeholder="搜索昵称、工作室、城市或风格"
              prefix={<SearchOutlined />}
            />
            <Select
              className="photographer-filter-select"
              allowClear
              placeholder="服务城市"
              value={serviceCity}
              onChange={(value) => { setServiceCity(value); setCurrent(1); }}
              options={(meta?.cities ?? []).map((city) => ({ value: city, label: city }))}
            />
            <Select
              className="photographer-filter-select"
              allowClear
              placeholder="擅长风格"
              value={styleType}
              onChange={(value) => { setStyleType(value); setCurrent(1); }}
              options={(meta?.styles ?? []).map((style) => ({ value: style.value, label: style.label }))}
            />
            <Button type="primary" className="photographer-search-submit" onClick={submitSearch}>搜索</Button>
            <Button type="text" className="photographer-filter-reset" onClick={resetFilters}>重置</Button>
          </div>
          <div className="photographer-result-meta">
            <Text type="secondary">{loading ? "加载中…" : `共 ${total} 位可预约摄影师`}</Text>
            <Text type="secondary">综合推荐</Text>
          </div>
          {error ? <Text type="danger">{error}</Text> : null}
          <Spin spinning={loading}>
            <section className="photographer-cards" aria-label="摄影师列表">
              {list.map((item) => <PhotographerListCard key={item.id} photographer={item} />)}
              {!loading && list.length === 0 ? <Empty description="暂无符合条件的摄影师" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
            </section>
          </Spin>
          {total > pageSize ? (
            <div className="photographer-pager">
              <Pagination current={current} pageSize={pageSize} total={total} onChange={setCurrent} showSizeChanger={false} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function PhotographerListCard({ photographer }: { photographer: Photographer }) {
  const city = photographer.serviceCity || photographer.city || "城市待完善";
  const years =
    photographer.workYears != null && photographer.workYears > 0
      ? `${photographer.workYears} 年`
      : "年限待完善";
  const appointments =
    photographer.appointmentCount != null ? `${photographer.appointmentCount} 次约拍` : "0 次约拍";

  return (
    <Link to={`/photographer/${photographer.id}`} className="plist-card-link">
      <Card
        className="plist-card"
        hoverable
        cover={
          <img
            className="plist-cover"
            src={photographer.homepageCover || photographer.avatar || FALLBACK_AVATAR}
            alt={`${photographer.nickname || "摄影师"}的作品`}
            loading="lazy"
          />
        }
      >
        <div className="plist-card-inner">
          <Avatar size={48} src={photographer.avatar || FALLBACK_AVATAR} shape="square" />
          <div className="plist-body">
            <div className="plist-title-row">
              <Text strong>{photographer.nickname || "摄影师"}</Text>
              <Text className="plist-score"><StarFilled aria-hidden="true" /> {formatScore(photographer.averageScore)}</Text>
            </div>
            <Paragraph type="secondary" ellipsis className="plist-line">
              擅长 {formatSpecialty(photographer.specialtyStyle)}
            </Paragraph>
            <Paragraph type="secondary" className="plist-line">
              城市 {city}
            </Paragraph>
            <Space size={[8, 8]} wrap>
              <Tag color="cyan">从业 {years}</Tag>
              <Tag>{appointments}</Tag>
            </Space>
          </div>
        </div>
      </Card>
    </Link>
  );
}
