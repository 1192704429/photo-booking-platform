import { PlusOutlined } from "@ant-design/icons";
import { Upload, type UploadProps } from "antd";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchPhotographerProfile,
  formatScore,
  isLoggedIn,
  STYLE_LABELS,
  updatePhotographerProfile,
  uploadUserFile,
  type PhotographerProfile,
} from "../../api";
import "./profile.css";

const PROFILE_PATH = "/studio/profile";
const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

const STYLE_OPTIONS = Object.entries(STYLE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

function loginRedirect(): string {
  return `/login?redirect=${encodeURIComponent(PROFILE_PATH)}`;
}

function parseSpecialtyValues(raw?: string): number[] {
  if (!raw) return [];
  const selected = new Set<number>();
  for (const part of raw.split(/[,，、/|]+/)) {
    const token = part.trim();
    if (!token) continue;
    const asNum = Number(token);
    if (Number.isFinite(asNum) && STYLE_LABELS[asNum]) {
      selected.add(asNum);
      continue;
    }
    const matched = STYLE_OPTIONS.find((item) => item.label === token);
    if (matched) selected.add(matched.value);
  }
  return Array.from(selected).sort((a, b) => a - b);
}

export function ProfilePage(): ReactNode {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<Pick<
    PhotographerProfile,
    "averageScore" | "appointmentCount" | "id"
  > | null>(null);

  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [workYears, setWorkYears] = useState("");
  const [personalIntro, setPersonalIntro] = useState("");
  const [styles, setStyles] = useState<number[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(loginRedirect(), { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPhotographerProfile()
      .then((data) => {
        if (cancelled) return;
        setStats({
          id: data.id,
          averageScore: data.averageScore,
          appointmentCount: data.appointmentCount,
        });
        setNickname(data.nickname || "");
        setAvatar(data.avatar || "");
        setServiceCity(data.serviceCity || "");
        setWorkYears(data.workYears != null ? String(data.workYears) : "");
        setPersonalIntro(data.personalIntro || "");
        setStyles(parseSpecialtyValues(data.specialtyStyle));
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(loginRedirect(), { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可维护个人主页");
          return;
        }
        setError(err.message || "主页信息加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const specialtyPreview = useMemo(
    () => styles.map((value) => STYLE_LABELS[value]).filter(Boolean).join(" · ") || "未选择风格",
    [styles],
  );

  function toggleStyle(value: number) {
    setStyles((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value].sort((a, b) => a - b),
    );
  }

  const onUploadAvatar: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadUserFile(file as File);
      setAvatar(url);
      onSuccess?.({ url });
    } catch (err) {
      const uploadError = err as Error;
      setError(uploadError.message || "头像上传失败");
      onError?.(uploadError);
    } finally {
      setUploading(false);
    }
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) {
      setError("请填写昵称或工作室名称");
      return;
    }
    let years: number | null = null;
    if (workYears.trim()) {
      years = Number(workYears);
      if (!Number.isFinite(years) || years < 0 || years > 80) {
        setError("从业年限请填写 0-80 的整数");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await updatePhotographerProfile({
        nickname: name,
        avatar: avatar.trim() || undefined,
        specialtyStyle: styles.join(","),
        serviceCity: serviceCity.trim() || undefined,
        workYears: years,
        personalIntro: personalIntro.trim(),
      });
      setStats({
        id: saved.id,
        averageScore: saved.averageScore,
        appointmentCount: saved.appointmentCount,
      });
      setSuccess("已保存，用户端摄影师详情将同步展示最新内容");
    } catch (err) {
      const apiError = err as Error & { code?: number };
      if (apiError.code === 401) {
        void navigate(loginRedirect(), { replace: true });
        return;
      }
      setError(apiError.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="profile-page">
        <Link to="/overview" className="profile-back">
          ← 返回数据概览
        </Link>
        <header className="profile-header">
          <p className="profile-brand">约拍 · 工作室</p>
          <h1>个人主页</h1>
          <p className="profile-sub">维护对外展示资料，保存后同步到用户端详情页</p>
        </header>

        {loading ? <p className="profile-state">加载中…</p> : null}
        {error ? (
          <div className="profile-state error" role="alert">
            {error}
            {error.includes("摄影师") ? (
              <Link to="/" className="profile-fallback">
                返回用户首页
              </Link>
            ) : null}
          </div>
        ) : null}
        {success ? (
          <div className="profile-state success" role="status">
            {success}
            {stats?.id ? (
              <Link to={`/photographer/${stats.id}`} className="profile-fallback">
                查看对外详情
              </Link>
            ) : null}
          </div>
        ) : null}

        {!loading && stats ? (
          <>
            <section className="profile-stats" aria-label="系统统计信息">
              <article>
                <p>综合评分</p>
                <strong>{formatScore(stats.averageScore)}</strong>
              </article>
              <article>
                <p>累计约拍</p>
                <strong>{stats.appointmentCount ?? 0} 次</strong>
              </article>
            </section>

            <form className="profile-form" onSubmit={(e) => void onSubmit(e)}>
              <div className="profile-avatar-block">
                <img src={avatar || FALLBACK_AVATAR} alt="" className="profile-avatar" />
                <div>
                  <p className="profile-field-label">头像</p>
                  <Upload
                    className="profile-avatar-upload"
                    listType="picture-card"
                    accept="image/*"
                    maxCount={1}
                    showUploadList={false}
                    customRequest={onUploadAvatar}
                    beforeUpload={(file) => file.type.startsWith("image/") ? true : Upload.LIST_IGNORE}
                  >
                    <span className="profile-upload-trigger"><PlusOutlined />{uploading ? "上传中" : "更换头像"}</span>
                  </Upload>
                </div>
              </div>

              <label>
                昵称 / 工作室名称
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={40}
                  required
                  placeholder="对外展示名称"
                />
              </label>

              <div>
                <p className="profile-field-label">擅长风格</p>
                <p className="profile-style-preview">{specialtyPreview}</p>
                <div className="profile-style-grid" role="group" aria-label="擅长风格">
                  {STYLE_OPTIONS.map((item) => {
                    const active = styles.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={active ? "style-chip active" : "style-chip"}
                        aria-pressed={active}
                        onClick={() => toggleStyle(item.value)}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label>
                服务城市
                <input
                  value={serviceCity}
                  onChange={(e) => setServiceCity(e.target.value)}
                  maxLength={40}
                  placeholder="如：上海 / 杭州"
                />
              </label>

              <label>
                从业年限
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={workYears}
                  onChange={(e) => setWorkYears(e.target.value)}
                  placeholder="单位：年"
                />
              </label>

              <label>
                个人介绍
                <textarea
                  value={personalIntro}
                  onChange={(e) => setPersonalIntro(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  placeholder="介绍拍摄风格、服务特色等"
                />
              </label>

              <button type="submit" disabled={saving || uploading}>
                {saving ? "保存中…" : "保存主页"}
              </button>
            </form>
          </>
        ) : null}
      </main>
    </div>
  );
}
