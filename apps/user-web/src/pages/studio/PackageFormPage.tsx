import { PlusOutlined } from "@ant-design/icons";
import { Select, Upload, type UploadProps } from "antd";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  createStudioPackage,
  fetchStudioPackage,
  isLoggedIn,
  STYLE_LABELS,
  stripHtml,
  updateStudioPackage,
  uploadUserFile,
} from "../../api";
import "./packages.css";

const TYPE_OPTIONS = Object.entries(STYLE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export function PackageFormPage(): ReactNode {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const packageId = Number(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [packageName, setPackageName] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [packageType, setPackageType] = useState<number | "">("");
  const [price, setPrice] = useState("");
  const [shootDuration, setShootDuration] = useState("");
  const [retouchedCount, setRetouchedCount] = useState("");
  const [originalCount, setOriginalCount] = useState("");
  const [applicablePeople, setApplicablePeople] = useState("");
  const [shootLocation, setShootLocation] = useState("");
  const [packageContent, setPackageContent] = useState("");
  const [serviceNotice, setServiceNotice] = useState("");
  const [status, setStatus] = useState(1);

  useEffect(() => {
    const redirect = isEdit ? `/studio/packages/${id}/edit` : "/studio/packages/new";
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }
    if (!isEdit) return;
    if (!Number.isFinite(packageId)) {
      setError("无效套餐");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchStudioPackage(packageId)
      .then((data) => {
        if (cancelled) return;
        setPackageName(data.packageName || "");
        setCoverImage(data.coverImage || "");
        setPackageType(data.packageType ?? "");
        setPrice(data.price != null && data.price !== "" ? String(data.price) : "");
        setShootDuration(data.shootDuration != null ? String(data.shootDuration) : "");
        setRetouchedCount(data.retouchedCount != null ? String(data.retouchedCount) : "");
        setOriginalCount(data.originalCount != null ? String(data.originalCount) : "");
        setApplicablePeople(data.applicablePeople != null ? String(data.applicablePeople) : "");
        setShootLocation(data.shootLocation || "");
        setPackageContent(stripHtml(data.packageContent) || "");
        setServiceNotice(data.serviceNotice || "");
        setStatus(data.status ?? 1);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
          return;
        }
        setError(err.message || "套餐加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate, packageId]);

  const onUploadCover: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadUserFile(file as File);
      setCoverImage(url);
      onSuccess?.({ url });
    } catch (err) {
      const uploadError = err as Error;
      setError(uploadError.message || "封面上传失败");
      onError?.(uploadError);
    } finally {
      setUploading(false);
    }
  };

  function parseOptionalInt(raw: string, label: string): number | null {
    if (!raw.trim()) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error(`${label}请填写非负整数`);
    }
    return n;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = packageName.trim();
    if (!name) {
      setError("请填写套餐名称");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0.01) {
      setError("套餐价格最低为 0.01 元");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        packageName: name,
        coverImage: coverImage.trim() || undefined,
        packageType: packageType === "" ? null : Number(packageType),
        price: priceNum,
        shootDuration: parseOptionalInt(shootDuration, "拍摄时长"),
        retouchedCount: parseOptionalInt(retouchedCount, "精修张数"),
        originalCount: parseOptionalInt(originalCount, "原片数量"),
        applicablePeople: parseOptionalInt(applicablePeople, "适用人数"),
        shootLocation: shootLocation.trim() || undefined,
        packageContent: packageContent.trim(),
        serviceNotice: serviceNotice.trim(),
        status,
      };
      if (isEdit && Number.isFinite(packageId)) {
        const saved = await updateStudioPackage(packageId, payload);
        void navigate(`/studio/packages/${saved.id}`, { replace: true });
      } else {
        const saved = await createStudioPackage(payload);
        void navigate(`/studio/packages/${saved.id}`, { replace: true });
      }
    } catch (err) {
      setError((err as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="packages-page">
        <Link
          to={isEdit && Number.isFinite(packageId) ? `/studio/packages/${packageId}` : "/studio/packages"}
          className="pkg-back"
        >
          ← 返回
        </Link>
        <header className="pkg-header">
          <div>
            <p className="pkg-brand">约拍 · 工作室</p>
            <h1>{isEdit ? "编辑套餐" : "发布套餐"}</h1>
            <p className="pkg-sub">填写套餐信息并保存</p>
          </div>
        </header>

        {loading ? <p className="pkg-state">加载中…</p> : null}
        {error ? (
          <div className="pkg-state error" role="alert">
            {error}
          </div>
        ) : null}

        {!loading ? (
          <form className="pkg-form" onSubmit={(e) => void onSubmit(e)}>
            <label>
              套餐名称
              <input
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                maxLength={80}
                required
                placeholder="如：情侣旅拍基础套餐"
              />
            </label>

            <div>
              <p className="pkg-field-label">套餐封面（可选）</p>
              <Upload
                className="pkg-cover-upload"
                listType="picture-card"
                accept="image/*"
                maxCount={1}
                fileList={coverImage ? [{ uid: "package-cover", name: "套餐封面", status: "done", url: coverImage }] : []}
                customRequest={onUploadCover}
                beforeUpload={(file) => {
                  if (!file.type.startsWith("image/")) {
                    setError("请选择图片文件作为封面");
                    return Upload.LIST_IGNORE;
                  }
                  return true;
                }}
                onRemove={() => { setCoverImage(""); return true; }}
              >
                <div className="pkg-upload-trigger"><PlusOutlined /><span>{uploading ? "上传中" : "上传封面"}</span></div>
              </Upload>
            </div>

            <label>
              套餐类型
              <Select
                className="pkg-type-select"
                value={packageType === "" ? undefined : packageType}
                onChange={(value) => setPackageType(value ?? "")}
                options={TYPE_OPTIONS}
                placeholder="请选择套餐类型"
                allowClear
              />
            </label>

            <label>
              套餐价格（元）
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="如：1280.00"
              />
            </label>

            <div className="pkg-form-grid">
              <label>
                拍摄时长（分钟）
                <input
                  type="number"
                  min={0}
                  value={shootDuration}
                  onChange={(e) => setShootDuration(e.target.value)}
                />
              </label>
              <label>
                精修张数
                <input
                  type="number"
                  min={0}
                  value={retouchedCount}
                  onChange={(e) => setRetouchedCount(e.target.value)}
                />
              </label>
              <label>
                原片数量
                <input
                  type="number"
                  min={0}
                  value={originalCount}
                  onChange={(e) => setOriginalCount(e.target.value)}
                />
              </label>
              <label>
                适用人数
                <input
                  type="number"
                  min={0}
                  value={applicablePeople}
                  onChange={(e) => setApplicablePeople(e.target.value)}
                />
              </label>
            </div>

            <label>
              拍摄地点
              <input
                value={shootLocation}
                onChange={(e) => setShootLocation(e.target.value)}
                maxLength={80}
                placeholder="如：杭州 · 西湖景区"
              />
            </label>

            <label>
              套餐说明
              <textarea
                value={packageContent}
                onChange={(e) => setPackageContent(e.target.value)}
                rows={5}
                maxLength={5000}
                placeholder="说明包含服务内容、交付物等"
              />
            </label>

            <label>
              服务须知
              <textarea
                value={serviceNotice}
                onChange={(e) => setServiceNotice(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="预约须知、改期规则等"
              />
            </label>

            <label>
              上架状态
              <Select
                value={status}
                onChange={(value) => setStatus(Number(value))}
                options={[{ value: 1, label: "上架" }, { value: 0, label: "下架" }]}
              />
            </label>

            <button type="submit" disabled={saving || uploading}>
              {saving ? "保存中…" : isEdit ? "保存修改" : "发布套餐"}
            </button>
          </form>
        ) : null}
      </main>
    </div>
  );
}
