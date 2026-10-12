import { PlusOutlined } from "@ant-design/icons";
import { Upload, type UploadFile, type UploadProps } from "antd";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  fetchOrderReviewPrepare,
  formatPrice,
  isLoggedIn,
  submitOrderReview,
  uploadUserFile,
  type OrderReviewPrepare,
} from "../../api";
import "./order-review.css";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80";

function formatDate(value?: string): string {
  return value ? String(value).slice(0, 10) : "-";
}

export function OrderReviewPage(): ReactNode {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const id = Number(orderId);
  const uploadingCountRef = useRef(0);

  const [prepare, setPrepare] = useState<OrderReviewPrepare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(`/order/${orderId}/review`)}`, {
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
    void fetchOrderReviewPrepare(id)
      .then((data) => {
        if (!cancelled) setPrepare(data);
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(`/order/${orderId}/review`)}`, {
            replace: true,
          });
          return;
        }
        setError(err.message || "评价信息加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate, orderId]);

  const uploadFiles: UploadFile[] = images.map((url, index) => ({
    uid: `review-image-${index}-${url}`,
    name: `返图 ${index + 1}`,
    status: "done",
    url,
  }));

  const onUploadImage: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    uploadingCountRef.current += 1;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadUserFile(file as File);
      setImages((current) => current.length >= 9 ? current : [...current, url]);
      onSuccess?.({ url });
    } catch (err) {
      const uploadError = err as Error;
      setError(uploadError.message || "返图上传失败");
      onError?.(uploadError);
    } finally {
      uploadingCountRef.current -= 1;
      if (uploadingCountRef.current === 0) setUploading(false);
    }
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!prepare) return;
    if (score < 1 || score > 5) {
      setError("请选择星级评分");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitOrderReview(prepare.orderId, {
        score,
        reviewContent: content.trim(),
        reviewImages: images.join(","),
        anonymousStatus: anonymous ? 1 : 0,
      });
      void navigate(`/order/${prepare.orderId}`, { replace: true });
    } catch (err) {
      const apiError = err as Error & { code?: number };
      if (apiError.code === 401) {
        void navigate(
          `/login?redirect=${encodeURIComponent(`/order/${prepare.orderId}/review`)}`,
          { replace: true },
        );
      } else {
        setError(apiError.message || "评价提交失败");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="app-shell">
      <main className="review-page">
        <Link
          to={Number.isFinite(id) ? `/order/${id}` : "/orders"}
          className="review-back"
        >
          ← 返回订单详情
        </Link>
        <h1>订单评价</h1>
        <p className="review-sub">订单已完成，感谢你的反馈</p>

        {loading ? <p className="review-state">加载中…</p> : null}
        {error ? (
          <div className="review-state error" role="alert">
            <p>{error}</p>
            <Link to={Number.isFinite(id) ? `/order/${id}` : "/orders"}>返回订单详情</Link>
          </div>
        ) : null}

        {prepare ? (
          <form className="review-form" onSubmit={(e) => void onSubmit(e)}>
            <section className="review-summary">
              <div className="review-photographer">
                <img src={prepare.photographerAvatar || FALLBACK_AVATAR} alt="" />
                <div>
                  <h2>{prepare.photographerName || "摄影师"}</h2>
                  <p>{prepare.orderNo}</p>
                </div>
              </div>
              <dl className="review-order">
                <div>
                  <dt>套餐</dt>
                  <dd>{prepare.packageName || "-"}</dd>
                </div>
                <div>
                  <dt>金额</dt>
                  <dd>{formatPrice(prepare.packagePrice)}</dd>
                </div>
                <div>
                  <dt>拍摄日期</dt>
                  <dd>{formatDate(prepare.shootDate)}</dd>
                </div>
                <div>
                  <dt>拍摄时间</dt>
                  <dd>
                    {prepare.startSlot || "-"} - {prepare.endSlot || "-"}
                  </dd>
                </div>
                <div>
                  <dt>拍摄地点</dt>
                  <dd>{prepare.shootLocation || "-"}</dd>
                </div>
              </dl>
            </section>

            <label className="review-field">
              <span>星级评分</span>
              <div className="review-stars" role="radiogroup" aria-label="星级评分">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={score === star}
                    aria-label={`${star} 星`}
                    className={score >= star ? "star active" : "star"}
                    onClick={() => setScore(star)}
                  >
                    ★
                  </button>
                ))}
                <em>{score ? `${score} 星` : "点击选择"}</em>
              </div>
            </label>

            <label className="review-field">
              <span>评价内容</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={500}
                placeholder="分享本次拍摄体验、成片质量与服务感受（选填）"
              />
              <small>{content.length}/500</small>
            </label>

            <div className="review-field">
              <span>返图上传</span>
              <Upload
                className="review-picture-upload"
                listType="picture-card"
                accept="image/*"
                multiple
                maxCount={9}
                fileList={uploadFiles}
                customRequest={onUploadImage}
                beforeUpload={(file) => file.type.startsWith("image/") ? true : Upload.LIST_IGNORE}
                onRemove={(file) => {
                  const index = images.indexOf(file.url || "");
                  if (index >= 0) removeImage(index);
                  return true;
                }}
              >
                {images.length < 9 ? <div className="review-upload-trigger"><PlusOutlined /><span>{uploading ? "上传中" : "选择图片"}</span></div> : null}
              </Upload>
              <span className="review-upload-hint">最多 9 张，支持批量上传</span>
            </div>

            <div className="review-field">
              <span>是否匿名</span>
              <div className="review-anonymous" role="radiogroup" aria-label="是否匿名">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!anonymous}
                  className={!anonymous ? "segment active" : "segment"}
                  onClick={() => setAnonymous(false)}
                >
                  实名评价
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={anonymous}
                  className={anonymous ? "segment active" : "segment"}
                  onClick={() => setAnonymous(true)}
                >
                  匿名评价
                </button>
              </div>
            </div>

            <button type="submit" className="review-submit" disabled={submitting}>
              {submitting ? "提交中…" : "提交评价"}
            </button>
          </form>
        ) : null}
      </main>
    </div>
  );
}
