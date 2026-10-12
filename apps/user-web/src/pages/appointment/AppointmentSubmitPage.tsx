import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  fetchAppointmentCalendar,
  fetchAppointmentPrepare,
  formatPrice,
  formatSpecialty,
  isLoggedIn,
  submitAppointment,
  type AppointmentCalendar,
  type AppointmentPrepare,
  type ScheduleSlot,
} from "../../api";
import "./appointment.css";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

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

export function AppointmentSubmitPage(): ReactNode {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const photographerId = Number(params.get("photographerId"));
  const packageId = Number(params.get("packageId"));

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [prepare, setPrepare] = useState<AppointmentPrepare | null>(null);
  const [calendar, setCalendar] = useState<AppointmentCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [shootLocation, setShootLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [peopleCount, setPeopleCount] = useState("");
  const [requirementNote, setRequirementNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthKey = monthLabel(viewYear, viewMonth);
  const redirectPath = `/appointment/submit?photographerId=${photographerId}&packageId=${packageId}`;

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
    }
  }, [navigate, redirectPath]);

  useEffect(() => {
    if (!Number.isFinite(photographerId) || !Number.isFinite(packageId)) {
      setError("缺少摄影师或套餐参数");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchAppointmentPrepare(photographerId, packageId)
      .then((data) => {
        if (cancelled) return;
        setPrepare(data);
        if (data.photographyPackage.shootLocation) {
          setShootLocation(data.photographyPackage.shootLocation);
        }
        if (data.photographyPackage.applicablePeople != null) {
          setPeopleCount(String(data.photographyPackage.applicablePeople));
        }
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
          return;
        }
        setError(err.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photographerId, packageId, navigate, redirectPath]);

  useEffect(() => {
    if (!Number.isFinite(photographerId) || !isLoggedIn()) return;
    let cancelled = false;
    void fetchAppointmentCalendar(photographerId, monthKey)
      .then((data) => {
        if (cancelled) return;
        setCalendar(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "档期加载失败");
      });
    return () => {
      cancelled = true;
    };
  }, [photographerId, monthKey]);

  const daySlots = useMemo(() => {
    if (!selectedDate || !calendar) return [];
    return calendar.slotsByDate[selectedDate] ?? [];
  }, [calendar, selectedDate]);

  const cells = useMemo(
    () => buildCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const availableSet = useMemo(
    () => new Set(calendar?.availableDates ?? []),
    [calendar],
  );

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelectedDate(null);
    setSelectedSlot(null);
  }

  function selectDate(date: string | null) {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    if (!selectedSlot) {
      setError("请选择可预约的时间段");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const peopleCountValue = Number(peopleCount);
      const result = await submitAppointment({
        photographerId,
        packageId,
        scheduleId: selectedSlot.scheduleId,
        shootLocation: shootLocation.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        ...(Number.isFinite(peopleCountValue) && peopleCountValue > 0
          ? { peopleCount: peopleCountValue }
          : {}),
        requirementNote: requirementNote.trim(),
      });
      void navigate(`/order/${result.orderId}`, { replace: true });
    } catch (err) {
      const error = err as Error & { code?: number };
      if (error.code === 401) {
        void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      } else {
        setError(error.message || "提交失败");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const photographer = prepare?.photographer;
  const pkg = prepare?.photographyPackage;

  return (
    <div className="app-shell">
      <main className="appointment-page">
        <Link
          to={Number.isFinite(photographerId) ? `/photographer/${photographerId}` : "/photographers"}
          className="appointment-back"
        >
          ← 返回详情
        </Link>
        <h1>预约提交</h1>
        <p className="appointment-sub">选择档期并填写拍摄信息，提交后等待摄影师确认</p>

        {loading ? <p className="appointment-state">加载中…</p> : null}
        {error ? <p className="appointment-state error">{error}</p> : null}

        {photographer && pkg ? (
          <>
            <section className="appointment-summary">
              <div className="summary-photographer">
                <img src={photographer.avatar || FALLBACK_AVATAR} alt="" />
                <div>
                  <h2>{photographer.nickname || "摄影师"}</h2>
                  <p>{photographer.serviceCity || photographer.city || "城市待完善"}</p>
                  <p>{formatSpecialty(photographer.specialtyStyle)}</p>
                </div>
              </div>
              <div className="summary-package">
                <div className="summary-package-title">
                  <h3>{pkg.packageName}</h3>
                  <strong>{formatPrice(pkg.price)}</strong>
                </div>
                <p>
                  {pkg.shootDuration != null ? `${pkg.shootDuration} 分钟` : "时长面议"}
                  {" · "}
                  精修 {pkg.retouchedCount ?? "-"} 张
                  {" · "}
                  原片 {pkg.originalCount ?? "-"}
                </p>
              </div>
            </section>

            <section className="appointment-calendar-block" aria-label="档期选择">
              <div className="calendar-head">
                <button type="button" onClick={() => shiftMonth(-1)}>
                  上月
                </button>
                <h2>{monthKey}</h2>
                <button type="button" onClick={() => shiftMonth(1)}>
                  下月
                </button>
              </div>
              <div className="calendar-weekdays">
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {cells.map((date, index) => {
                  if (!date) return <span key={`e-${index}`} className="calendar-cell empty" />;
                  const hasSlot = availableSet.has(date);
                  const active = selectedDate === date;
                  return (
                    <button
                      key={date}
                      type="button"
                      className={[
                        "calendar-cell",
                        hasSlot ? "has-slot" : "",
                        active ? "active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={!hasSlot}
                      onClick={() => selectDate(date)}
                    >
                      {Number(date.slice(-2))}
                    </button>
                  );
                })}
              </div>

              <div className="slot-block">
                <h3>{selectedDate ? `${selectedDate} 时段` : "请先选择日期"}</h3>
                <div className="slot-list">
                  {daySlots.map((slot) => (
                    <button
                      key={slot.scheduleId}
                      type="button"
                      className={[
                        "slot-item",
                        slot.selectable ? "selectable" : "disabled",
                        selectedSlot?.scheduleId === slot.scheduleId ? "active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={!slot.selectable}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <span>
                        {slot.startSlot} - {slot.endSlot}
                      </span>
                      <em>{slot.statusLabel}</em>
                    </button>
                  ))}
                  {selectedDate && daySlots.length === 0 ? (
                    <p className="appointment-state">当天暂无档期</p>
                  ) : null}
                </div>
              </div>
            </section>

            <form className="appointment-form" onSubmit={(e) => void onSubmit(e)}>
              <label>
                拍摄地点
                <input
                  value={shootLocation}
                  onChange={(e) => setShootLocation(e.target.value)}
                  required
                  placeholder="请输入拍摄地点"
                />
              </label>
              <label>
                联系人
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  placeholder="请输入联系人姓名"
                />
              </label>
              <label>
                联系电话
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  placeholder="请输入手机号"
                />
              </label>
              <label>
                拍摄人数
                <input
                  type="number"
                  min={1}
                  value={peopleCount}
                  onChange={(e) => setPeopleCount(e.target.value)}
                  placeholder="可选"
                />
              </label>
              <label>
                需求备注
                <textarea
                  value={requirementNote}
                  onChange={(e) => setRequirementNote(e.target.value)}
                  rows={4}
                  placeholder="风格偏好、妆造需求等"
                />
              </label>
              <button type="submit" disabled={submitting || !selectedSlot}>
                {submitting ? "提交中…" : "确认提交约拍申请"}
              </button>
            </form>
          </>
        ) : null}
      </main>
    </div>
  );
}
