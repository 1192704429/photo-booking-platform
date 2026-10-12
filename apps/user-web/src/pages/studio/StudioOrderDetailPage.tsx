import { PlusOutlined } from "@ant-design/icons";
import { Upload, type UploadProps } from "antd";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  acceptStudioOrder,
  advanceStudioOrderProgress,
  fetchStudioOrder,
  formatPrice,
  isLoggedIn,
  rejectStudioOrder,
  uploadUserFile,
  type StudioOrder,
  type StudioOrderDelivery,
} from "../../api";
import "./studio-orders.css";

const TIMELINE_STAGES = [
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
  pending_confirm: 2,
  pending_shoot: 3,
  shoot_finished: 4,
  processing: 5,
  awaiting_user: 7,
  completed: 8,
};

function formatDate(value?: string): string {
  return value ? String(value).slice(0, 10) : "-";
}

function formatDateTime(value?: string): string {
  return value ? String(value).slice(0, 16) : "";
}

function splitImages(raw?: string): string[] {
  return String(raw ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StudioOrderDetailPage(): ReactNode {
  const { id: idParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = Number(idParam);
  const redirectPath = `/studio/orders/${idParam}`;

  const [order, setOrder] = useState<StudioOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressNote, setProgressNote] = useState("");
  const [deliveryDescription, setDeliveryDescription] = useState("");
  const [sampleImages, setSampleImages] = useState<string[]>([]);
  const [retouchedImages, setRetouchedImages] = useState<string[]>([]);
  const [focusDelivery, setFocusDelivery] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
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
    void fetchStudioOrder(id)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        if (searchParams.get("action") === "progress" && data.canSubmitDelivery) {
          setFocusDelivery(true);
        }
      })
      .catch((err: Error & { code?: number }) => {
        if (cancelled) return;
        if (err.code === 401) {
          void navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`, { replace: true });
          return;
        }
        if (err.code === 403) {
          setError("仅摄影师账号可处理约拍订单");
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
  }, [navigate, id, redirectPath, searchParams]);

  async function onAccept() {
    if (!order || !window.confirm("确认接受该申请？接受后将锁定档期并进入待拍摄。")) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      setOrder(await acceptStudioOrder(order.id));
      setMessage("已接受申请，进入待拍摄");
    } catch (err) {
      setError((err as Error).message || "接受失败");
    } finally {
      setActing(false);
    }
  }

  async function onReject() {
    if (!order) return;
    const reply = window.prompt("可选填写拒绝原因：", "") ?? null;
    if (reply === null) return;
    if (!window.confirm("确认拒绝该申请？档期将重新开放。")) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      setOrder(await rejectStudioOrder(order.id, reply.trim()));
      setMessage("已拒绝申请");
    } catch (err) {
      setError((err as Error).message || "拒绝失败");
    } finally {
      setActing(false);
    }
  }

  async function onAdvanceStatus() {
    if (!order?.canUpdateProgress) return;
    if (!window.confirm(`确认执行「${order.nextProgressAction || "更新进度"}」？`)) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const data = await advanceStudioOrderProgress(order.id, {
        progressNote: progressNote.trim() || undefined,
      });
      setOrder(data);
      setProgressNote("");
      setMessage(`已更新为：${data.statusLabel || "进度已变更"}`);
      if (data.canSubmitDelivery) setFocusDelivery(true);
    } catch (err) {
      setError((err as Error).message || "更新进度失败");
    } finally {
      setActing(false);
    }
  }

  async function uploadImages(
    files: FileList | File[] | null,
    kind: "sample" | "retouch",
  ) {
    if (!files?.length) return;
    const selected = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) {
      setError("请选择图片文件");
      return;
    }
    const max = kind === "sample" ? 30 : 60;
    const current = kind === "sample" ? sampleImages : retouchedImages;
    const remain = max - current.length;
    if (remain <= 0) {
      setError(kind === "sample" ? "样片最多 30 张" : "精修图最多 60 张");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of selected.slice(0, remain)) {
        uploaded.push(await uploadUserFile(file));
      }
      if (kind === "sample") {
        setSampleImages((prev) => [...prev, ...uploaded].slice(0, max));
      } else {
        setRetouchedImages((prev) => [...prev, ...uploaded].slice(0, max));
      }
    } catch (err) {
      setError((err as Error).message || "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  function createDeliveryUpload(kind: "sample" | "retouch"): UploadProps["customRequest"] {
    return async ({ file, onError, onSuccess }) => {
      try {
        await uploadImages([file as File], kind);
        onSuccess?.({});
      } catch (err) {
        onError?.(err as Error);
      }
    };
  }

  async function onSubmitDelivery(event: FormEvent) {
    event.preventDefault();
    if (!order?.canSubmitDelivery) return;
    if (!sampleImages.length && !retouchedImages.length) {
      setError("请至少上传样片或精修图");
      return;
    }
    if (!deliveryDescription.trim()) {
      setError("请填写交付说明");
      return;
    }
    if (!window.confirm("确认提交成片交付？提交后订单将进入待用户确认。")) return;
    setActing(true);
    setError(null);
    setMessage(null);
    try {
      const data = await advanceStudioOrderProgress(order.id, {
        deliveryDescription: deliveryDescription.trim() || undefined,
        sampleImages: sampleImages.join(","),
        retouchedImages: retouchedImages.join(","),
        retouchedCount: retouchedImages.length || undefined,
      });
      setOrder(data);
      setSampleImages([]);
      setRetouchedImages([]);
      setDeliveryDescription("");
      setFocusDelivery(false);
      setMessage("成片已交付，等待用户确认");
    } catch (err) {
      setError((err as Error).message || "提交交付失败");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="studio-orders-page so-detail-page">
        <Link to="/studio/orders" className="so-back">
          ← 返回订单列表
        </Link>

        <header className="so-header">
          <div>
            <p className="so-brand">订单详情与成片交付</p>
            <h1>{order?.orderNo || "订单详情"}</h1>
            <p className="so-sub">按进度更新状态，后期完成后上传样片与精修图交付</p>
          </div>
        </header>

        {loading ? <p className="so-state">加载中…</p> : null}
        {error ? (
          <p className="so-state error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="so-state ok">{message}</p> : null}

        {!loading && order ? (
          <>
            <section className="so-detail-card so-status-hero">
              <div className="so-detail-top">
                <div>
                  <p className="so-muted">当前状态</p>
                  <h2>{order.statusLabel || "状态未知"}</h2>
                </div>
                <span className={`so-status status-${order.statusKey || "unknown"}`}>
                  {order.statusLabel}
                </span>
              </div>
              <OrderTimeline order={order} />
            </section>

            <section className="so-detail-card">
              <h3>预约信息</h3>
              <dl className="so-detail-grid">
                <div>
                  <dt>预约用户</dt>
                  <dd>{order.userName || "-"}</dd>
                </div>
                <div>
                  <dt>拍摄人数</dt>
                  <dd>{order.peopleCount ?? "-"}</dd>
                </div>
                <div>
                  <dt>拍摄日期</dt>
                  <dd>{formatDate(order.shootDate)}</dd>
                </div>
                <div>
                  <dt>拍摄时间</dt>
                  <dd>
                    {order.startSlot || "-"} - {order.endSlot || "-"}
                  </dd>
                </div>
                <div className="full">
                  <dt>拍摄地点</dt>
                  <dd>{order.shootLocation || "-"}</dd>
                </div>
                <div>
                  <dt>联系人</dt>
                  <dd>{order.contactName || "-"}</dd>
                </div>
                <div>
                  <dt>联系电话</dt>
                  <dd>{order.contactPhone || "-"}</dd>
                </div>
                <div className="full">
                  <dt>需求备注</dt>
                  <dd>{order.shootRequirement || "无"}</dd>
                </div>
              </dl>
            </section>

            <section className="so-detail-card">
              <h3>套餐信息</h3>
              <dl className="so-detail-grid">
                <div className="full">
                  <dt>摄影套餐</dt>
                  <dd>{order.packageName || "-"}</dd>
                </div>
                <div>
                  <dt>套餐金额</dt>
                  <dd>{formatPrice(order.packagePrice)}</dd>
                </div>
                <div>
                  <dt>下单时间</dt>
                  <dd>{formatDateTime(order.createTime) || "-"}</dd>
                </div>
              </dl>
            </section>

            {(order.canAccept || order.canReject || order.canUpdateProgress) && (
              <section className="so-detail-card">
                <h3>进度操作</h3>
                {order.canUpdateProgress ? (
                  <label className="so-field">
                    进度说明（可选）
                    <textarea
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      rows={2}
                      placeholder="可选补充本次状态更新说明"
                    />
                  </label>
                ) : null}
                <div className="so-actions detail">
                  {order.canAccept ? (
                    <button type="button" className="so-btn accept" disabled={acting} onClick={() => void onAccept()}>
                      接受申请
                    </button>
                  ) : null}
                  {order.canReject ? (
                    <button type="button" className="so-btn reject" disabled={acting} onClick={() => void onReject()}>
                      拒绝申请
                    </button>
                  ) : null}
                  {order.canUpdateProgress ? (
                    <button
                      type="button"
                      className="so-btn accept"
                      disabled={acting}
                      onClick={() => void onAdvanceStatus()}
                    >
                      {acting ? "提交中…" : order.nextProgressAction || "更新进度"}
                    </button>
                  ) : null}
                </div>
                {order.statusKey === "pending_shoot" ? (
                  <p className="so-hint">当前为待拍摄，完成后可标记为「拍摄完成」。</p>
                ) : null}
                {order.statusKey === "shoot_finished" ? (
                  <p className="so-hint">拍摄已完成，可进入「后期处理中」。</p>
                ) : null}
              </section>
            )}

            {(order.canSubmitDelivery || focusDelivery || (order.deliveries?.length ?? 0) > 0) && (
              <section className="so-detail-card so-delivery-card" id="delivery">
                <h3>成片交付</h3>
                {order.canSubmitDelivery ? (
                  <form className="so-delivery-form" onSubmit={(e) => void onSubmitDelivery(e)}>
                    <p className="so-hint">上传样片与精修图并填写交付说明，提交后订单进入待用户确认。</p>

                    <div className="so-upload-block">
                      <div className="so-upload-head">
                        <div><strong>样片</strong><span>用于让用户预览成片效果</span></div>
                        <Upload
                          className="so-delivery-upload"
                          listType="picture-card"
                          accept="image/*"
                          multiple
                          fileList={sampleImages.map((url, index) => ({
                            uid: `sample-${index}-${url}`,
                            name: `样片 ${index + 1}`,
                            status: "done",
                            url,
                          }))}
                          disabled={uploading || acting || sampleImages.length >= 30}
                          customRequest={createDeliveryUpload("sample")}
                          onRemove={(file) => {
                            setSampleImages((current) => current.filter((url) => url !== file.url));
                            return true;
                          }}
                        >
                          {sampleImages.length < 30 ? <><PlusOutlined /> 上传样片</> : null}
                        </Upload>
                      </div>
                    </div>

                    <div className="so-upload-block">
                      <div className="so-upload-head">
                        <div><strong>精修图</strong><span>上传最终交付的精修照片</span></div>
                        <Upload
                          className="so-delivery-upload"
                          listType="picture-card"
                          accept="image/*"
                          multiple
                          fileList={retouchedImages.map((url, index) => ({
                            uid: `retouched-${index}-${url}`,
                            name: `精修图 ${index + 1}`,
                            status: "done",
                            url,
                          }))}
                          disabled={uploading || acting || retouchedImages.length >= 60}
                          customRequest={createDeliveryUpload("retouch")}
                          onRemove={(file) => {
                            setRetouchedImages((current) => current.filter((url) => url !== file.url));
                            return true;
                          }}
                        >
                          {retouchedImages.length < 60 ? <><PlusOutlined /> 上传精修图</> : null}
                        </Upload>
                      </div>
                    </div>

                    <label className="so-field">
                      <span className="so-field-title">交付说明 <em>必填</em></span>
                      <textarea
                        value={deliveryDescription}
                        onChange={(e) => { setDeliveryDescription(e.target.value); if (error === "请填写交付说明") setError(null); }}
                        rows={3}
                        maxLength={500}
                        placeholder="告知用户成片说明、下载方式或注意事项，例如下载方式、交付范围和注意事项"
                      />
                      <small className="so-field-help">请说明本次交付包含的内容，方便用户确认。</small>
                    </label>

                    <button type="submit" className="so-btn accept" disabled={acting || uploading}>
                      {acting ? "提交中…" : "提交成片交付"}
                    </button>
                  </form>
                ) : (
                  <p className="so-hint">
                    {order.statusKey === "awaiting_user"
                      ? "成片已提交，等待用户确认。"
                      : order.statusKey === "completed"
                        ? "用户已确认，订单已完成。"
                        : "完成后期处理后可在此提交成片。"}
                  </p>
                )}

                {(order.deliveries ?? []).map((delivery) => (
                  <DeliveryView key={delivery.id} delivery={delivery} />
                ))}
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function OrderTimeline({ order }: { order: StudioOrder }): ReactNode {
  const progressByType = useMemo(() => {
    const map = new Map<number, { createTime?: string; progressDescription?: string }>();
    for (const item of order.progress ?? []) {
      if (item.progressType != null) map.set(item.progressType, item);
    }
    return map;
  }, [order.progress]);

  const reached = useMemo(() => {
    const set = new Set<number>((order.progress ?? []).map((item) => item.progressType ?? 0));
    set.add(1);
    const key = order.statusKey || "";
    if (
      order.photographerConfirmStatus === 1 ||
      order.applyStatus === 1 ||
      ["pending_shoot", "shoot_finished", "processing", "awaiting_user", "completed"].includes(key)
    ) {
      set.add(2);
      set.add(3);
    }
    if (["shoot_finished", "processing", "awaiting_user", "completed"].includes(key)) set.add(4);
    if (["processing", "awaiting_user", "completed"].includes(key)) set.add(5);
    if (["awaiting_user", "completed"].includes(key) || (order.deliveries?.length ?? 0) > 0) {
      set.add(6);
    }
    if (
      key === "completed" ||
      order.deliveries?.some((item) => item.deliveryStatus === 2 || item.confirmTime)
    ) {
      set.add(7);
    }
    if (key === "completed") set.add(8);
    return set;
  }, [order]);

  const currentType =
    order.statusKey === "rejected" || order.statusKey === "cancelled"
      ? undefined
      : CURRENT_TYPE_BY_STATUS[order.statusKey || ""];

  return (
    <ol className="so-stage-timeline">
      {TIMELINE_STAGES.map((stage) => {
        const done = reached.has(stage.type);
        const current = currentType === stage.type;
        const progress = progressByType.get(stage.type);
        return (
          <li
            key={stage.type}
            className={[done ? "done" : "", current ? "current" : ""].filter(Boolean).join(" ")}
          >
            <strong>{stage.label}</strong>
            <span>
              {formatDateTime(progress?.createTime) ||
                (stage.type === 1 ? formatDateTime(order.createTime) : "") ||
                (stage.type === 4 ? formatDateTime(order.shootFinishTime) : "") ||
                (stage.type === 6 ? formatDateTime(order.deliveryTime) : "") ||
                (stage.type === 8 ? formatDateTime(order.finishTime) : "") ||
                (done ? "已完成" : "待进行")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ImageGrid({
  images,
  onRemove,
}: {
  images: string[];
  onRemove?: (url: string) => void;
}): ReactNode {
  if (!images.length) return <p className="so-state">暂无图片</p>;
  return (
    <div className="so-image-grid">
      {images.map((url) => (
        <div key={url} className="so-image-item">
          <img src={url} alt="" />
          {onRemove ? (
            <button type="button" onClick={() => onRemove(url)}>
              移除
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DeliveryView({ delivery }: { delivery: StudioOrderDelivery }): ReactNode {
  const samples = splitImages(delivery.sampleImages);
  const retouched = splitImages(delivery.retouchedImages);
  return (
    <article className="so-delivery-view">
      <header>
        <strong>{delivery.deliveryNo || "交付记录"}</strong>
        <span>
          {delivery.deliveryStatus === 2 || delivery.confirmTime
            ? `用户已确认 ${formatDateTime(delivery.confirmTime)}`
            : `待用户确认 · ${formatDateTime(delivery.createTime)}`}
        </span>
      </header>
      {delivery.deliveryDescription ? <p>{delivery.deliveryDescription}</p> : null}
      {samples.length ? (
        <>
          <h4>样片（{samples.length}）</h4>
          <ImageGrid images={samples} />
        </>
      ) : null}
      {retouched.length ? (
        <>
          <h4>
            精修图（{delivery.retouchedCount ?? retouched.length}）
          </h4>
          <ImageGrid images={retouched} />
        </>
      ) : null}
    </article>
  );
}
