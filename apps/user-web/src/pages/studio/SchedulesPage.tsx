import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchStudioSchedules,
  isLoggedIn,
  saveStudioScheduleDay,
  type StudioScheduleCalendar,
  type StudioScheduleSlot,
} from "../../api";
import "./schedules.css";

const SCHEDULES_PATH = "/studio/schedules";

const PRESET_SLOTS = [
  { startSlot: "09:00", endSlot: "11:00" },
  { startSlot: "11:00", endSlot: "13:00" },
  { startSlot: "14:00", endSlot: "16:00" },
  { startSlot: "16:00", endSlot: "18:00" },
];

type DraftMode = "off" | "available" | "unavailable";

interface DraftSlot {
  key: string;
  startSlot: string;
  endSlot: string;
  mode: DraftMode;
  locked: boolean;
  scheduleId?: number;
  statusLabel?: string;
}

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(SCHEDULES_PATH)}`;
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

function slotKey(start: string, end: string): string {
  return `${start}|${end}`;
}

function statusToMode(status?: number): DraftMode {
  if (status === 1) return "available";
  if (status === 0) return "unavailable";
  return "off";
}

function buildDraft(daySlots: StudioScheduleSlot[]): DraftSlot[] {
  const byKey = new Map(daySlots.map((s) => [slotKey(s.startSlot, s.endSlot), s]));
  const drafts: DraftSlot[] = [];
  const used = new Set<string>();

  for (const preset of PRESET_SLOTS) {
    const key = slotKey(preset.startSlot, preset.endSlot);
    const existing = byKey.get(key);
    used.add(key);
    drafts.push({
      key,
      startSlot: preset.startSlot,
      endSlot: preset.endSlot,
      mode: existing
        ? existing.locked
          ? "unavailable"
          : statusToMode(existing.scheduleStatus)
        : "off",
      locked: Boolean(existing?.locked),
      scheduleId: existing?.scheduleId,
      statusLabel: existing?.locked ? "已预约" : existing?.statusLabel,
    });
  }

  for (const slot of daySlots) {
    const key = slotKey(slot.startSlot, slot.endSlot);
    if (used.has(key)) continue;
    drafts.push({
      key,
      startSlot: slot.startSlot,
      endSlot: slot.endSlot,
      mode: slot.locked ? "unavailable" : statusToMode(slot.scheduleStatus),
      locked: Boolean(slot.locked),
      scheduleId: slot.scheduleId,
      statusLabel: slot.locked ? "已预约" : slot.statusLabel,
    });
  }

  return drafts.sort((a, b) => a.startSlot.localeCompare(b.startSlot));
}

export function SchedulesPage(): ReactNode {
  const navigate = useNavigate();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [calendar, setCalendar] = useState<StudioScheduleCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftSlot[]>([]);
  const [customStart, setCustomStart] = useState("10:00");
  const [customEnd, setCustomEnd] = useState("12:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const monthKey = monthLabel(viewYear, viewMonth);
  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const withSlots = useMemo(
    () => new Set(calendar?.datesWithSlots ?? []),
    [calendar],
  );
  const unavailableSet = useMemo(
    () => new Set(calendar?.unavailableDates ?? []),
    [calendar],
  );
  const bookedSet = useMemo(() => new Set(calendar?.bookedDates ?? []), [calendar]);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchStudioSchedules(monthKey)
      .then((data) => {
        if (cancelled) return;
        setCalendar(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可管理档期");
          setCalendar(null);
          return;
        }
        setError(err.message || "档期加载失败");
        setCalendar(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, monthKey]);

  useEffect(() => {
    if (!selectedDate || !calendar) {
      setDrafts([]);
      return;
    }
    const daySlots = calendar.slotsByDate?.[selectedDate] ?? [];
    setDrafts(buildDraft(daySlots));
    setMessage(null);
  }, [selectedDate, calendar]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDate(null);
  }

  function cycleMode(item: DraftSlot) {
    if (item.locked) return;
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.key !== item.key) return d;
        const nextMode: DraftMode =
          d.mode === "off" ? "available" : d.mode === "available" ? "unavailable" : "off";
        const updated: DraftSlot = {
          key: d.key,
          startSlot: d.startSlot,
          endSlot: d.endSlot,
          mode: nextMode,
          locked: d.locked,
          scheduleId: d.scheduleId,
        };
        return updated;
      }),
    );
    setMessage(null);
  }

  function addCustomSlot() {
    const start = customStart.trim();
    const end = customEnd.trim();
    if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) {
      setError("自定义时段格式应为 HH:mm");
      return;
    }
    const key = slotKey(start, end);
    if (drafts.some((d) => d.key === key)) {
      setError("该时段已存在");
      return;
    }
    setError(null);
    const next: DraftSlot = {
      key,
      startSlot: start,
      endSlot: end,
      mode: "available",
      locked: false,
    };
    setDrafts((prev) =>
      [...prev, next].sort((a, b) => a.startSlot.localeCompare(b.startSlot)),
    );
  }

  async function persist(dayUnavailable: boolean) {
    if (!selectedDate) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payloadSlots = dayUnavailable
        ? undefined
        : drafts
            .filter((d) => d.locked || d.mode !== "off")
            .map((d) => ({
              startSlot: d.startSlot,
              endSlot: d.endSlot,
              scheduleStatus: d.locked ? 0 : d.mode === "available" ? 1 : 0,
            }));

      const data = await saveStudioScheduleDay({
        scheduleDate: selectedDate,
        dayUnavailable,
        slots: payloadSlots,
      });
      setCalendar(data);
      setMessage(dayUnavailable ? "已设为不可预约日" : "档期已保存");
    } catch (err) {
      const e = err as Error & { code?: number };
      if (e.code === 401) {
        void navigate(loginRedirect(), { replace: true });
        return;
      }
      setError(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const modeLabel = (d: DraftSlot): string => {
    if (d.locked) return "已预约";
    if (d.mode === "available") return "可预约";
    if (d.mode === "unavailable") return "不可预约";
    return "未设置";
  };

  return (
    <div className="app-shell">
      <main className="schedules-page">
        <Link to="/overview" className="schedules-back">
          ← 返回概览
        </Link>

        <header className="schedules-header">
          <div>
            <p className="schedules-brand">Studio Schedule</p>
            <h1>档期管理</h1>
            <p className="schedules-sub">日历查看时段，设置可预约时间或不可预约日期</p>
          </div>
        </header>

        {loading ? <p className="schedules-state">加载中…</p> : null}
        {error ? <p className="schedules-state error">{error}</p> : null}
        {message ? <p className="schedules-state ok">{message}</p> : null}

        <section className="schedules-calendar" aria-label="档期日历">
          <div className="calendar-head">
            <button type="button" onClick={() => shiftMonth(-1)}>
              上月
            </button>
            <h2>{monthKey}</h2>
            <button type="button" onClick={() => shiftMonth(1)}>
              下月
            </button>
          </div>

          <div className="calendar-legend">
            <span className="leg available">有可约</span>
            <span className="leg booked">有预约</span>
            <span className="leg closed">不可约</span>
          </div>

          <div className="calendar-weekdays">
            {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {cells.map((date, index) => {
              if (!date) return <span key={`e-${index}`} className="calendar-cell empty" />;
              const active = selectedDate === date;
              const has = withSlots.has(date);
              const booked = bookedSet.has(date);
              const closed = unavailableSet.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  className={[
                    "calendar-cell",
                    has ? "has-slot" : "",
                    booked ? "booked" : "",
                    closed ? "closed" : "",
                    active ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedDate(date)}
                >
                  {Number(date.slice(-2))}
                </button>
              );
            })}
          </div>
        </section>

        <section className="schedules-day" aria-label="当日时段">
          <h2>{selectedDate ? `${selectedDate} 时段` : "请先选择日期"}</h2>

          {selectedDate ? (
            <>
              <div className="slot-list">
                {drafts.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={[
                      "slot-item",
                      item.locked ? "locked" : "",
                      item.mode === "available" ? "available" : "",
                      item.mode === "unavailable" && !item.locked ? "unavailable" : "",
                      item.mode === "off" ? "off" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={item.locked || saving}
                    onClick={() => cycleMode(item)}
                  >
                    <span>
                      {item.startSlot} - {item.endSlot}
                    </span>
                    <em>{modeLabel(item)}</em>
                  </button>
                ))}
              </div>

              <p className="schedules-hint">点击时段切换：未设置 → 可预约 → 不可预约。已预约时段锁定不可改。</p>

              <div className="custom-slot">
                <label>
                  开始
                  <input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    disabled={saving}
                  />
                </label>
                <label>
                  结束
                  <input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    disabled={saving}
                  />
                </label>
                <button type="button" className="ghost-btn" onClick={addCustomSlot} disabled={saving}>
                  添加时段
                </button>
              </div>

              <div className="schedules-actions">
                <button
                  type="button"
                  className="primary-btn"
                  disabled={saving}
                  onClick={() => void persist(false)}
                >
                  {saving ? "保存中…" : "保存当日档期"}
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={saving}
                  onClick={() => void persist(true)}
                >
                  设为不可预约日
                </button>
              </div>
            </>
          ) : (
            <p className="schedules-state">选择日历中的日期后，可维护当天时段</p>
          )}
        </section>
      </main>
    </div>
  );
}
