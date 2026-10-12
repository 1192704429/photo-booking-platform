import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { QRCode } from "antd";
import {
  confirmOrderDelivery,
  fetchOrderDetail,
  formatPrice,
  isLoggedIn,
  prepayOrder,
  type OrderDeliveryItem,
  type OrderDetail,
  type OrderProgressItem,
} from "../../api";
import "./order-detail.css";
import "./payment.css";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

const TIMELINE_STAGES = [
  { type: 0, label: "订单支付" },
  { type: 1, label: "约拍申请" },
  { type: 2, label: "摄影师确认" },
  { type: 3, label: "待拍摄" },
  { type: 4, label: "拍摄完成" },
  { type: 5, label: "后期处理中" },
  { type: 6, label: "成片交付" },
  { type: 7, label: "用户确认" },
  { type: 8, label: "订单完成" },
] as const;

const CURRENT_TYPE_BY_STATUS: Record<string, number> = {
  pending_pay: 0,
  pending_confirm: 2,
  pending_shoot: 3,
  shoot_finished: 4,
  processing: 5,
  awaiting_user: 7,
  completed: 8,
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending_pay: "预约信息已保存，请完成支付以提交给摄影师确认",
  pending_confirm: "约拍申请已提交，等待摄影师确认档期",
  pending_shoot: "摄影师已确认，等待按约拍摄",
  shoot_finished: "拍摄已完成，进入后期与交付阶段",
  processing: "成片正在后期处理中，请耐心等待",
  awaiting_user: "摄影师已交付成片，请确认后完成订单",
  completed: "订单已完成，感谢本次约拍",
  rejected: "本次约拍申请未通过，可重新预约其他档期",
  cancelled: "该订单已取消",
};

type PayChannel = 1 | 2;

function submitAlipayForm(html: string): void {
  const container = document.createElement("div");
  container.innerHTML = html;
  const form = container.querySelector("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("支付宝未返回有效的支付表单");
  }
  const action = form.getAttribute("action") ?? "";
  if (!/^https?:\/\//i.test(action)) {
    throw new Error("支付宝支付表单地址无效");
  }
  form.style.display = "none";
  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 3000);
}

function formatDate(value?: string): string {
  return value ? String(value).slice(0, 10) : "-";
}

function formatDateTime(value?: string): string {
  return value ? String(value).slice(0, 16) : "";
}

function splitFileList(raw?: string): string[] {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function fileNameOf(url: string): string {
  try {
    return decodeURIComponent(url.split("/").pop() || "下载文件");
  } catch {
    return url.split("/").pop() || "下载文件";
  }
}

function deliveryHasContent(delivery: OrderDeliveryItem): boolean {
  return Boolean(
    delivery.sampleImages ||
      delivery.retouchedImages ||
      delivery.originalFiles ||
      delivery.deliveryDescription,
  );
}

export function OrderDetailPage(): ReactNode {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const id = Number(orderId);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [payingChannel, setPayingChannel] = useState<PayChannel | null>(null);
  const [wechatPayUrl, setWechatPayUrl] = useState<string | null>(null);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(`/order/${orderId}`)}`, {
        replace: true,
      });
      return;
    }
    if (!Number.isFinite(id)) {
      setError("无效订单");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchOrderDetail(id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(`/order/${orderId}`)}`, {
            replace: true,
          });
          return;
        }
        setError(err.message || "订单加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, orderId]);

  useEffect(() => {
    if (!paymentStarted || !detail || detail.statusKey !== "pending_pay") return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const updated = await fetchOrderDetail(id);
        if (cancelled) return;
        setDetail(updated);
        if (updated.statusKey !== "pending_pay") {
          setWechatPayUrl(null);
          setPaymentStarted(false);
          setPaymentMessage("支付成功，订单已提交给摄影师确认");
        } else if (attempts >= 120) {
          setPaymentStarted(false);
          setPaymentMessage("暂未查询到支付结果，请稍后手动刷新");
        }
      } catch {
        // 短暂网络错误不打断支付，下一轮继续查询。
      }
    };
    const timer = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [detail?.statusKey, id, paymentStarted]);

  async function onStartPay(channel: PayChannel) {
    if (!detail) return;
    setPayingChannel(channel);
    setPaymentMessage(null);
    try {
      const response = await prepayOrder(detail.orderNo, channel);
      if (channel === 1) {
        setWechatPayUrl(response.payData);
        setPaymentStarted(true);
      } else {
        setPaymentStarted(true);
        submitAlipayForm(response.payData);
      }
    } catch (err) {
      setPaymentStarted(false);
      setPaymentMessage(err instanceof Error ? err.message : "拉起支付失败，请重试");
    } finally {
      setPayingChannel(null);
    }
  }

  async function onRefreshPayment() {
    if (!detail) return;
    setPaymentMessage("正在查询支付结果…");
    try {
      const updated = await fetchOrderDetail(detail.id);
      setDetail(updated);
      setPaymentMessage(
        updated.statusKey === "pending_pay"
          ? "暂未支付，请完成付款后再刷新"
          : "支付成功，订单状态已更新",
      );
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : "查询支付结果失败");
    }
  }

  async function onConfirmDelivery() {
    if (!detail || !window.confirm("确认已收到全部成片并完成本次订单吗？")) return;
    setConfirming(true);
    setError(null);
    try {
      const updated = await confirmOrderDelivery(detail.id);
      setDetail(updated);
    } catch (err) {
      const apiError = err as Error & { code?: number };
      if (apiError.code === 401) {
        void navigate(
          `/login?redirect=${encodeURIComponent(`/order/${detail.id}`)}`,
          { replace: true },
        );
      } else {
        setError(apiError.message || "确认失败");
      }
    } finally {
      setConfirming(false);
    }
  }

  const statusKey = detail?.statusKey ?? "";
  const statusLabel = detail?.statusLabel ?? "状态未知";

  return (
    <main className="order-detail-page">
        <Link to="/orders" className="od-back">
          ← 返回订单
        </Link>
        <h1>订单详情</h1>

        {loading ? <p className="od-state">加载中…</p> : null}
        {error ? (
          <p className="od-state error" role="alert">
            {error}
          </p>
        ) : null}

        {detail ? (
          <>
            <section className="od-status-hero">
              <span className={`od-hero-status od-hero-${statusKey}`}>{statusLabel}</span>
              <p>{STATUS_DESCRIPTIONS[statusKey] ?? "订单进行中，请留意最新进度"}</p>
            </section>

            {detail.canPay || detail.statusKey === "pending_pay" ? (
              <PaymentSection
                amount={detail.packagePrice}
                orderNo={detail.orderNo}
                payingChannel={payingChannel}
                wechatPayUrl={wechatPayUrl}
                message={paymentMessage}
                onStartPay={onStartPay}
                onRefresh={onRefreshPayment}
              />
            ) : paymentMessage ? (
              <p className="od-payment-success" role="status">{paymentMessage}</p>
            ) : null}

            <OrderProgressTimeline detail={detail} />

            <section className="od-card">
              <div className="od-card-head">
                <h2>拍摄信息</h2>
                <span className="od-order-no">{detail.orderNo}</span>
              </div>
              <div className="od-photographer">
                <img src={detail.photographerAvatar || FALLBACK_AVATAR} alt="" />
                <div>
                  <strong>{detail.photographerName || "摄影师"}</strong>
                  <p>摄影师 / 工作室</p>
                </div>
              </div>
              <dl className="od-rows">
                <div>
                  <dt>摄影套餐</dt>
                  <dd>{detail.packageName || "-"}</dd>
                </div>
                <div>
                  <dt>套餐金额</dt>
                  <dd>{formatPrice(detail.packagePrice)}</dd>
                </div>
                <div>
                  <dt>拍摄日期</dt>
                  <dd>{formatDate(detail.shootDate)}</dd>
                </div>
                <div>
                  <dt>拍摄时间</dt>
                  <dd>
                    {detail.startSlot || "-"} - {detail.endSlot || "-"}
                  </dd>
                </div>
                <div>
                  <dt>拍摄地点</dt>
                  <dd>{detail.shootLocation || "-"}</dd>
                </div>
                <div>
                  <dt>拍摄人数</dt>
                  <dd>{detail.peopleCount != null ? `${detail.peopleCount} 人` : "-"}</dd>
                </div>
              </dl>
            </section>

            <section className="od-card">
              <h2>联系与需求</h2>
              <dl className="od-rows">
                <div>
                  <dt>联系人</dt>
                  <dd>{detail.contactName || "-"}</dd>
                </div>
                <div>
                  <dt>联系电话</dt>
                  <dd>{detail.contactPhone || "-"}</dd>
                </div>
                <div>
                  <dt>需求备注</dt>
                  <dd>{detail.shootRequirement || "无"}</dd>
                </div>
              </dl>
            </section>

            {detail.deliveries?.some(deliveryHasContent) ? (
              <DeliverySection deliveries={detail.deliveries.filter(deliveryHasContent)} />
            ) : null}

            <div className="od-actions">
              {detail.canConfirmDelivery ? (
                <button
                  type="button"
                  className="od-action primary"
                  disabled={confirming}
                  onClick={() => void onConfirmDelivery()}
                >
                  {confirming ? "确认中…" : "确认交付，完成订单"}
                </button>
              ) : null}
              {detail.canReview ? (
                // 订单完成且未评价：跳转订单评价页
                <Link className="od-action secondary" to={`/order/${detail.id}/review`}>
                  去评价
                </Link>
              ) : null}
              <Link
                className="od-action secondary"
                to={`/complaint?orderId=${detail.id}&targetUserId=${detail.photographerId}`}
              >
                举报/投诉
              </Link>
            </div>
          </>
        ) : null}
    </main>
  );
}

function PaymentSection({
  amount,
  orderNo,
  payingChannel,
  wechatPayUrl,
  message,
  onStartPay,
  onRefresh,
}: {
  amount?: number | string;
  orderNo: string;
  payingChannel: PayChannel | null;
  wechatPayUrl: string | null;
  message: string | null;
  onStartPay: (channel: PayChannel) => Promise<void>;
  onRefresh: () => Promise<void>;
}): ReactNode {
  return (
    <section className="od-card od-payment-card" aria-labelledby="payment-title">
      <div className="od-payment-head">
        <div>
          <span className="od-payment-eyebrow">安全支付</span>
          <h2 id="payment-title">完成订单支付</h2>
          <p>订单 {orderNo}</p>
        </div>
        <strong>{formatPrice(amount)}</strong>
      </div>

      <div className="od-payment-methods" aria-label="选择支付方式">
        <button
          type="button"
          className="od-payment-method wechat"
          disabled={payingChannel !== null}
          onClick={() => void onStartPay(1)}
        >
          <span className="od-payment-brand" aria-hidden="true">微</span>
          <span><strong>微信支付</strong><small>生成二维码，使用微信扫码</small></span>
          <span className="od-payment-arrow" aria-hidden="true">›</span>
        </button>
        <button
          type="button"
          className="od-payment-method alipay"
          disabled={payingChannel !== null}
          onClick={() => void onStartPay(2)}
        >
          <span className="od-payment-brand" aria-hidden="true">支</span>
          <span><strong>支付宝</strong><small>跳转支付宝收银台完成付款</small></span>
          <span className="od-payment-arrow" aria-hidden="true">›</span>
        </button>
      </div>

      {payingChannel ? (
        <p className="od-payment-feedback" role="status">
          正在拉起{payingChannel === 1 ? "微信" : "支付宝"}支付…
        </p>
      ) : null}

      {wechatPayUrl ? (
        <div className="od-wechat-qr">
          <div className="od-qr-frame" aria-label="微信支付二维码">
            <QRCode value={wechatPayUrl} size={220} bordered={false} errorLevel="M" />
          </div>
          <div className="od-qr-copy">
            <h3>请使用微信扫一扫</h3>
            <p>二维码会在支付结果确认后自动关闭，请不要重复付款。</p>
            <button type="button" onClick={() => void onRefresh()}>
              我已完成支付
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="od-payment-feedback" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}

function OrderProgressTimeline({ detail }: { detail: OrderDetail }): ReactNode {
  const progressByType = useMemo(() => {
    const map = new Map<number, OrderProgressItem>();
    for (const item of detail.progress ?? []) {
      map.set(item.progressType, item);
    }
    return map;
  }, [detail.progress]);

  const reachedTypes = useMemo(() => {
    const reached = new Set<number>((detail.progress ?? []).map((item) => item.progressType));
    if (detail.statusKey !== "pending_pay") reached.add(1);
    if (
      detail.photographerConfirmStatus === 1 ||
      detail.applyStatus === 1 ||
      ["pending_shoot", "shoot_finished", "processing", "awaiting_user", "completed"].includes(
        detail.statusKey,
      )
    ) {
      reached.add(2);
      reached.add(3);
    }
    if (
      ["shoot_finished", "processing", "awaiting_user", "completed"].includes(detail.statusKey)
    ) {
      reached.add(4);
    }
    if (["processing", "awaiting_user", "completed"].includes(detail.statusKey)) {
      reached.add(5);
    }
    if (
      ["awaiting_user", "completed"].includes(detail.statusKey) ||
      (detail.deliveries?.length ?? 0) > 0
    ) {
      reached.add(6);
    }
    if (
      detail.statusKey === "completed" ||
      detail.deliveries?.some((item) => item.deliveryStatus === 2 || item.confirmTime)
    ) {
      reached.add(7);
    }
    if (detail.statusKey === "completed") {
      reached.add(8);
    }
    return reached;
  }, [detail]);

  const currentType =
    detail.statusKey === "rejected" || detail.statusKey === "cancelled"
      ? undefined
      : CURRENT_TYPE_BY_STATUS[detail.statusKey];

  return (
    <section className="od-card">
      <h2>订单进度</h2>
      <ol className="od-timeline">
        {TIMELINE_STAGES.map((stage) => {
          const done = reachedTypes.has(stage.type);
          const current = currentType === stage.type;
          const progress = progressByType.get(stage.type);
          const time =
            formatDateTime(progress?.createTime) ||
            (stage.type === 1 ? formatDateTime(detail.createTime) : "") ||
            (stage.type === 4 ? formatDateTime(detail.shootFinishTime) : "") ||
            (stage.type === 6
              ? formatDateTime(detail.deliveries?.find((item) => item.createTime)?.createTime)
              : "") ||
            (stage.type === 7
              ? formatDateTime(
                  detail.deliveries?.find((item) => item.confirmTime)?.confirmTime,
                )
              : "") ||
            (stage.type === 8 ? formatDateTime(detail.finishTime) : "");
          return (
            <li
              key={stage.type}
              className={[
                "od-timeline-item",
                done ? "done" : "",
                current ? "current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="od-timeline-dot" aria-hidden="true" />
              <div className="od-timeline-content">
                <h3>{stage.label}</h3>
                {progress?.progressTitle || progress?.progressDescription ? (
                  <p>{progress.progressTitle || progress.progressDescription}</p>
                ) : null}
                {time ? <time>{time}</time> : null}
              </div>
            </li>
          );
        })}
        {detail.statusKey === "rejected" || detail.statusKey === "cancelled" ? (
          <li className="od-timeline-item terminal">
            <span className="od-timeline-dot" aria-hidden="true" />
            <div className="od-timeline-content">
              <h3>{detail.statusLabel}</h3>
              <p>{detail.cancelReason || STATUS_DESCRIPTIONS[detail.statusKey]}</p>
            </div>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

function DeliverySection({ deliveries }: { deliveries: OrderDeliveryItem[] }): ReactNode {
  return (
    <>
      {deliveries.map((delivery) => (
        <section className="od-card" key={delivery.id}>
          <div className="od-card-head">
            <h2>成片交付</h2>
            <span className="od-delivery-status">
              {delivery.deliveryStatus === 2
                ? "用户已确认"
                : delivery.deliveryStatus === 1
                  ? "已交付"
                  : "待交付"}
            </span>
          </div>

          <FileGroup title="样片" urls={splitFileList(delivery.sampleImages)} />
          <FileGroup title="精修图" urls={splitFileList(delivery.retouchedImages)} />

          {delivery.originalFiles ? (
            <div className="od-file-group">
              <h3>原片文件</h3>
              <ul className="od-original-list">
                {splitFileList(delivery.originalFiles).map((url, index) => (
                  <li key={`${url}-${index}`}>
                    <span>{fileNameOf(url)}</span>
                    <a href={url} download>
                      下载
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {delivery.deliveryDescription ? (
            <div className="od-delivery-note">
              <h3>交付说明</h3>
              <p>{delivery.deliveryDescription}</p>
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}

function FileGroup({ title, urls }: { title: string; urls: string[] }): ReactNode {
  if (!urls.length) return null;
  return (
    <div className="od-file-group">
      <h3>{title}</h3>
      <div className="od-image-grid">
        {urls.map((url, index) => (
          <figure className="od-media-item" key={`${url}-${index}`}>
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={`${title} ${index + 1}`} loading="lazy" />
            </a>
            <figcaption>
              <a href={url} target="_blank" rel="noreferrer">
                查看
              </a>
              <a href={url} download>
                下载
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
