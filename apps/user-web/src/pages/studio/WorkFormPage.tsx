import { PlusOutlined } from "@ant-design/icons";
import { Select, Upload, type UploadFile, type UploadProps } from "antd";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  createStudioWork,
  fetchStudioWork,
  isLoggedIn,
  STYLE_LABELS,
  updateStudioWork,
  uploadUserFile,
} from "../../api";
import "./works.css";

const STYLE_OPTIONS = Object.entries(STYLE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export function WorkFormPage(): ReactNode {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const workId = Number(id);
  const navigate = useNavigate();
  const uploadingCountRef = useRef(0);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workTitle, setWorkTitle] = useState("");
  const [styleType, setStyleType] = useState<number | "">("");
  const [shootLocation, setShootLocation] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const redirect = isEdit ? `/studio/works/${id}/edit` : "/studio/works/new";
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }
    if (!isEdit) return;
    if (!Number.isFinite(workId)) {
      setError("无效作品");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchStudioWork(workId)
      .then((data) => {
        if (cancelled) return;
        setWorkTitle(data.workTitle || "");
        setStyleType(data.styleType ?? "");
        setShootLocation(data.shootLocation || "");
        setWorkDescription(data.workDescription || "");
        const imgs = (data.workImages || data.coverImage || "")
          .split(/[,，]/)
          .map((item) => item.trim())
          .filter(Boolean);
        setImages(imgs);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
          return;
        }
        setError(err.message || "作品加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate, workId]);

  const uploadFiles = useMemo<UploadFile[]>(
    () => images.map((url, index) => ({
      uid: `work-image-${index}-${url}`,
      name: index === 0 ? "作品封面" : `作品图片 ${index + 1}`,
      status: "done",
      url,
    })),
    [images],
  );

  const onUploadImage: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    uploadingCountRef.current += 1;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadUserFile(file as File);
      setImages((current) => current.length >= 12 ? current : [...current, url]);
      onSuccess?.({ url });
    } catch (err) {
      const uploadError = err as Error;
      setError(uploadError.message || "图片上传失败");
      onError?.(uploadError);
    } finally {
      uploadingCountRef.current -= 1;
      if (uploadingCountRef.current === 0) setUploading(false);
    }
  };

  function removeImage(url: string) {
    setImages((current) => current.filter((item) => item !== url));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const title = workTitle.trim();
    if (!title) {
      setError("请填写作品标题");
      return;
    }
    if (!images.length) {
      setError("请至少上传一张作品图片");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      workTitle: title,
      coverImage: images[0],
      workImages: images.join(","),
      styleType: styleType === "" ? null : Number(styleType),
      shootLocation: shootLocation.trim() || undefined,
      workDescription: workDescription.trim(),
      status: 1,
    };
    try {
      if (isEdit && Number.isFinite(workId)) {
        const saved = await updateStudioWork(workId, payload);
        void navigate(`/studio/works/${saved.id}`, { replace: true });
      } else {
        const saved = await createStudioWork(payload);
        void navigate(`/studio/works/${saved.id}`, { replace: true });
      }
    } catch (err) {
      setError((err as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="works-page">
        <Link to={isEdit && Number.isFinite(workId) ? `/studio/works/${workId}` : "/studio/works"} className="works-back">
          ← 返回
        </Link>
        <header className="works-header">
          <div>
            <p className="works-brand">约拍 · 工作室</p>
            <h1>{isEdit ? "编辑作品" : "上传作品"}</h1>
            <p className="works-sub">填写作品信息并上传图片</p>
          </div>
        </header>

        {loading ? <p className="works-state">加载中…</p> : null}
        {error ? (
          <div className="works-state error" role="alert">
            {error}
          </div>
        ) : null}

        {!loading ? (
          <form className="work-form" onSubmit={(e) => void onSubmit(e)}>
            <label>
              作品标题
              <input
                value={workTitle}
                onChange={(e) => setWorkTitle(e.target.value)}
                maxLength={80}
                required
                placeholder="如：西湖暮色人像"
              />
            </label>

            <label>
              拍摄风格
              <Select
                className="work-style-select"
                value={styleType === "" ? undefined : styleType}
                onChange={(value) => setStyleType(value ?? "")}
                options={STYLE_OPTIONS}
                placeholder="请选择拍摄风格"
                allowClear
              />
            </label>

            <label>
              拍摄地点
              <input
                value={shootLocation}
                onChange={(e) => setShootLocation(e.target.value)}
                maxLength={80}
                placeholder="如：杭州 · 西湖"
              />
            </label>

            <div>
              <p className="work-field-label">作品图片</p>
              <Upload
                className="work-picture-upload"
                listType="picture-card"
                accept="image/*"
                multiple
                maxCount={12}
                fileList={uploadFiles}
                customRequest={onUploadImage}
                beforeUpload={(file) => {
                  if (!file.type.startsWith("image/")) {
                    setError("请选择图片文件");
                    return Upload.LIST_IGNORE;
                  }
                  return true;
                }}
                onRemove={(file) => {
                  if (file.url) removeImage(file.url);
                  return true;
                }}
              >
                {images.length < 12 ? (
                  <div className="work-upload-trigger">
                    <PlusOutlined />
                    <span>{uploading ? "上传中" : "上传图片"}</span>
                  </div>
                ) : null}
              </Upload>
              <p className="work-upload-hint">支持批量上传，最多 12 张；第一张图片将作为作品封面</p>
            </div>

            <label>
              作品描述
              <textarea
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="介绍拍摄故事、光线与构图等"
              />
            </label>

            <button type="submit" disabled={saving || uploading}>
              {saving ? "保存中…" : isEdit ? "保存修改" : "提交作品"}
            </button>
          </form>
        ) : null}
      </main>
    </div>
  );
}
