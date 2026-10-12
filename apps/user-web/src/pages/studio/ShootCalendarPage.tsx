import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchStudioShootCalendar,
  isLoggedIn,
  type StudioOrder,
  type StudioShootCalendar,
} from "../../api";
import "./shoot-calendar.css";

const PATH = "/studio/shoot-calendar";

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(PATH)}`;
}

function monthLabel(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function buildCalendarCells(year: number, monthIndex: number): Array<string | null> {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: Array<string | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  return cells;
}

function todayKey(): string {
  const now = new Date();
  return monthLabel(now.getFullYear(), now.getMonth()) + `-${String(now.getDate()).padStart(2, "0")}`;
}

function formatSlot(order: StudioOrder): string {
  if (!order.startSlot && !order.endSlot) return "时间待定";
  return `${order.startSlot || "-"} - ${order.endSlot || "-"}`;
}

export function ShootCalendarPage(): ReactNode {
  const navigate = useNavigate();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [calendar, setCalendar] = useState<StudioShootCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthKey = monthLabel(viewYear, viewMonth);
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const shootSet = useMemo(() => new Set(calendar?.shootDates ?? []), [calendar]);
  const dayOrders = useMemo(() => {
    if (!selectedDate || !calendar) return [];
    return calendar.ordersByDate?.[selectedDate] ?? [];
  }, [calendar, selectedDate]);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioShootCalendar(monthKey)
      .then((data) => {
        if (cancelled) return;
        setCalendar(data);
        const dates = data.shootDates ?? [];
        if (selectedDate && selectedDate.startsWith(monthKey)) {
          return;
        }
        if (dates.includes(todayKey()) && todayKey().startsWith(monthKey)) {
          setSelectedDate(todayKey());
        } else if (dates.length) {
          setSelectedDate(dates[0]);
        } else {
          setSelectedDate(null);
        }
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可查看拍摄日程");
          setCalendar(null);
          return;
        }
        setError(err.message || "拍摄日程加载失败");
        setCalendar(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload by month
  }, [navigate, monthKey]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="app-shell">
      <main className="shoot-calendar-page">
        <Link to="/overview" className="sc-back">
          ← 返回概览
        </Link>

        <header className="sc-header">
          <div>
            <p className="sc-brand">Shoot Calendar</p>
            <h1>拍摄日程</h1>
            <p className="sc-sub">查看已确认的拍摄安排，点击进入订单详情</p>
          </div>
        </header>

        {loading ? <p className="sc-state">加载中…</p> : null}
        {error ? (
          <p className="sc-state error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="sc-calendar" aria-label="拍摄日历">
          <div className="sc-calendar-head">
            <button type="button" onClick={() => shiftMonth(-1)}>
              上月
            </button>
            <h2>{monthKey}</h2>
            <button type="button" onClick={() => shiftMonth(1)}>
              下月
            </button>
          </div>

          <div className="sc-weekdays">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="sc-grid">
            {cells.map((date, index) => {
              if (!date) return <span key={`e-${index}`} className="sc-cell empty" />;
              const hasShoot = shootSet.has(date);
              const active = selectedDate === date;
              const isToday = date === todayKey();
              return (
                <button
                  key={date}
                  type="button"
                  className={[
                    "sc-cell",
                    hasShoot ? "has-shoot" : "",
                    active ? "active" : "",
                    isToday ? "today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(date)}
                >
                  <em>{Number(date.slice(-2))}</em>
                  {hasShoot ? <i className="sc-dot" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="sc-day" aria-label="当日拍摄安排">
          <h2>{selectedDate ? `${selectedDate} 拍摄安排` : "请选择日期"}</h2>
          {!selectedDate ? (
            <p className="sc-state">选择日历中的日期查看当天任务</p>
          ) : dayOrders.length === 0 ? (
            <p className="sc-state">当天暂无已确认拍摄安排</p>
          ) : (
            <ul className="sc-list">
              {dayOrders.map((order) => (
                <li key={order.id}>
                  <Link to={`/studio/orders/${order.id}`} className="sc-item">
                    <div className="sc-item-top">
                      <strong>{formatSlot(order)}</strong>
                      <span className={`sc-status status-${order.statusKey || "unknown"}`}>
                        {order.statusLabel || "已确认"}
                      </span>
                    </div>
                    <p className="sc-item-user">{order.userName || "用户"}</p>
                    <p className="sc-item-meta">{order.packageName || "摄影套餐"}</p>
                    <p className="sc-item-meta">{order.shootLocation || "地点待定"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
