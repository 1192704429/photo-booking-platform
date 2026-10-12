import { Card, Empty, Spin, Tag, Typography } from "antd";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchMyOrders,
  formatPrice,
  isLoggedIn,
  type UserOrderSummary,
} from "../../api";
import "./orders.css";

const { Title, Paragraph, Text } = Typography;

const ORDER_FILTERS = [
  { key: "", label: "全部" },
  { key: "pending_pay", label: "待支付" },
  { key: "pending_confirm", label: "待确认" },
  { key: "pending_shoot", label: "待拍摄" },
  { key: "shoot_finished", label: "拍摄完成" },
  { key: "processing", label: "后期中" },
  { key: "awaiting_user", label: "待确认成片" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已拒绝" },
  { key: "cancelled", label: "已取消" },
] as const;

const ORDERS_PATH = "/orders";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(ORDERS_PATH)}`;
}

function formatDate(value?: string): string {
  return value ? String(value).slice(0, 10) : "-";
}

export function OrdersPage(): ReactNode {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("");
  const [orders, setOrders] = useState<UserOrderSummary[]>([]);
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
    void fetchMyOrders(status || undefined)
      .then((data) => {
        if (!cancelled) setOrders(data ?? []);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        setOrders([]);
        setError(err.message || "订单加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, status]);

  return (
    <main className="orders-page">
      <header className="orders-header">
        <Text className="orders-brand">约拍</Text>
        <Title level={3}>我的订单</Title>
        <Paragraph type="secondary">查看全部约拍订单与当前进度</Paragraph>
      </header>

      <div className="orders-tabs" role="tablist" aria-label="订单状态筛选">
        {ORDER_FILTERS.map((filter) => (
          <Tag.CheckableTag
            key={filter.key}
            checked={status === filter.key}
            onChange={(checked) => {
              if (checked) setStatus(filter.key);
            }}
          >
            {filter.label}
          </Tag.CheckableTag>
        ))}
      </div>

      {error ? <Text type="danger">{error}</Text> : null}

      <Spin spinning={loading}>
        {!loading && !error && orders.length === 0 ? (
          <Empty
            description="暂无相关约拍订单"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Link to="/photographers">去挑选摄影师</Link>
          </Empty>
        ) : null}

        <section className="orders-list" aria-label="约拍订单列表">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </section>
      </Spin>
    </main>
  );
}

function OrderCard({ order }: { order: UserOrderSummary }): ReactNode {
  const shootTime =
    order.startSlot || order.endSlot
      ? `${order.startSlot || "-"} - ${order.endSlot || "-"}`
      : "-";
  return (
    <Link className="orders-card-link" to={`/order/${order.id}`}>
      <Card className="orders-card" hoverable>
        <div className="orders-card-head">
          <div className="orders-card-title">
            <Text strong>{order.packageName || "约拍订单"}</Text>
            <Text type="secondary">{order.orderNo}</Text>
          </div>
          <Tag color="cyan">{order.statusLabel || "进行中"}</Tag>
        </div>
        <div className="orders-meta">
          <div>
            <Text type="secondary">摄影师</Text>
            <Text>{order.photographerName || "-"}</Text>
          </div>
          <div>
            <Text type="secondary">拍摄日</Text>
            <Text>{formatDate(order.shootDate)}</Text>
          </div>
          <div>
            <Text type="secondary">时段</Text>
            <Text>{shootTime}</Text>
          </div>
          <div>
            <Text type="secondary">金额</Text>
            <Text>{formatPrice(order.packagePrice)}</Text>
          </div>
        </div>
      </Card>
    </Link>
  );
}
