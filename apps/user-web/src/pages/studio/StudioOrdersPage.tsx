import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Select } from "antd";
import { Link, useNavigate } from "react-router";
import {
  acceptStudioOrder,
  fetchStudioOrders,
  isLoggedIn,
  rejectStudioOrder,
  type StudioOrder,
} from "../../api";
import "./studio-orders.css";

const ORDERS_PATH = "/studio/orders";

const STATUS_OPTIONS = [
  { key: "", label: "全部状态" },
  { key: "pending_confirm", label: "待摄影师确认" },
  { key: "pending_shoot", label: "待拍摄" },
  { key: "shoot_finished", label: "拍摄完成" },
  { key: "processing", label: "后期处理中" },
  { key: "awaiting_user", label: "待用户确认" },
  { key: "completed", label: "已完成" },
  { key: "rejected", label: "已拒绝" },
  { key: "cancelled", label: "已取消" },
];

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(ORDERS_PATH)}`;
}

function formatDate(value?: string): string {
  return value ? String(value).slice(0, 10) : "-";
}

function formatSlot(order: StudioOrder): string {
  if (!order.startSlot && !order.endSlot) return "-";
  return `${order.startSlot || "-"} - ${order.endSlot || "-"}`;
}

export function StudioOrdersPage(): ReactNode {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [shootDateStart, setShootDateStart] = useState("");
  const [shootDateEnd, setShootDateEnd] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedStart, setAppliedStart] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [list, setList] = useState<StudioOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioOrders({
      status: appliedStatus || undefined,
      shootDateStart: appliedStart || undefined,
      shootDateEnd: appliedEnd || undefined,
    })
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
          setError("仅摄影师账号可处理约拍订单");
          setList([]);
          return;
        }
        setError(err.message || "订单加载失败");
        setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, appliedStatus, appliedStart, appliedEnd]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    setAppliedStatus(status);
    setAppliedStart(shootDateStart);
    setAppliedEnd(shootDateEnd);
  }

  async function onAccept(order: StudioOrder) {
    if (!window.confirm(`确认接受订单 ${order.orderNo || order.id}？接受后将锁定对应档期并进入待拍摄。`)) {
      return;
    }
    setActingId(order.id);
    setError(null);
    try {
      await acceptStudioOrder(order.id);
      const data = await fetchStudioOrders({
        status: appliedStatus || undefined,
        shootDateStart: appliedStart || undefined,
        shootDateEnd: appliedEnd || undefined,
      });
      setList(data ?? []);
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 401) {
        void navigate(loginRedirect(), { replace: true });
        return;
      }
      setError(e.message || "接受失败");
    } finally {
      setActingId(null);
    }
  }

  async function onReject(order: StudioOrder) {
    const reply = window.prompt("可选填写拒绝原因：", "") ?? null;
    if (reply === null) return;
    if (!window.confirm(`确认拒绝订单 ${order.orderNo || order.id}？档期将重新开放。`)) {
      return;
    }
    setActingId(order.id);
    setError(null);
    try {
      await rejectStudioOrder(order.id, reply.trim());
      const data = await fetchStudioOrders({
        status: appliedStatus || undefined,
        shootDateStart: appliedStart || undefined,
        shootDateEnd: appliedEnd || undefined,
      });
      setList(data ?? []);
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 401) {
        void navigate(loginRedirect(), { replace: true });
        return;
      }
      setError(e.message || "拒绝失败");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="app-shell">
      <main className="studio-orders-page">
        <Link to="/overview" className="so-back">
          ← 返回概览
        </Link>

        <header className="so-header">
          <div>
            <p className="so-brand">Studio Orders</p>
            <h1>约拍订单</h1>
            <p className="so-sub">处理预约申请、查看进度，仅本人订单</p>
          </div>
        </header>

        <form className="so-filters" onSubmit={onFilter}>
          <label>
            订单状态
            <Select
              value={status || undefined}
              onChange={(value) => setStatus(value ?? "")}
              options={STATUS_OPTIONS.map((item) => ({ value: item.key, label: item.label }))}
              placeholder="全部状态"
              allowClear
            />
          </label>
          <label>
            拍摄日起
            <input
              type="date"
              value={shootDateStart}
              onChange={(e) => setShootDateStart(e.target.value)}
            />
          </label>
          <label>
            拍摄日止
            <input
              type="date"
              value={shootDateEnd}
              onChange={(e) => setShootDateEnd(e.target.value)}
            />
          </label>
          <button type="submit">筛选</button>
        </form>

        {loading ? <p className="so-state">加载中…</p> : null}
        {error ? (
          <p className="so-state error" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && list.length === 0 ? (
          <p className="so-state">暂无符合条件的订单</p>
        ) : null}

        {!loading && list.length > 0 ? (
          <div className="so-table-wrap">
            <table className="so-table">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>摄影套餐</th>
                  <th>拍摄日期</th>
                  <th>拍摄时间</th>
                  <th>拍摄地点</th>
                  <th>联系方式</th>
                  <th>订单状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((order) => (
                  <tr key={order.id}>
                    <td>{order.userName || "用户"}</td>
                    <td>{order.packageName || "-"}</td>
                    <td>{formatDate(order.shootDate)}</td>
                    <td>{formatSlot(order)}</td>
                    <td>{order.shootLocation || "-"}</td>
                    <td>
                      <div className="so-contact">
                        <span>{order.contactName || "-"}</span>
                        <span>{order.contactPhone || "-"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`so-status status-${order.statusKey || "unknown"}`}>
                        {order.statusLabel || "未知"}
                      </span>
                    </td>
                    <td>
                      <div className="so-actions">
                        {order.canAccept ? (
                          <button
                            type="button"
                            className="so-btn accept"
                            disabled={actingId === order.id}
                            onClick={() => void onAccept(order)}
                          >
                            接受
                          </button>
                        ) : null}
                        {order.canReject ? (
                          <button
                            type="button"
                            className="so-btn reject"
                            disabled={actingId === order.id}
                            onClick={() => void onReject(order)}
                          >
                            拒绝
                          </button>
                        ) : null}
                        <Link to={`/studio/orders/${order.id}`} className="so-btn link">
                          详情
                        </Link>
                        {order.canUpdateProgress || order.canSubmitDelivery ? (
                          <Link
                            to={`/studio/orders/${order.id}?action=progress`}
                            className="so-btn link"
                          >
                            {order.canSubmitDelivery ? "成片交付" : "更新进度"}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
