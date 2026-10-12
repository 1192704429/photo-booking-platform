import { Button, Modal, Upload, type UploadFile, type UploadProps } from "antd";
import { Plus, UploadCloud } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { generatedUploadFile } from "../api";

function valueToFiles(value?: string): UploadFile[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url) => ({ uid: url, name: url.split("/").pop() || "已上传文件", status: "done", url }));
}

/** 配置驱动表单共用上传组件，值保持为逗号分隔 URL，与旧 Vue ImageUpload 一致。 */
export function GeneratedUpload({
  value,
  onChange,
  disabled = false,
  kind = "image",
  maxCount = 1,
}: {
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  disabled?: boolean | undefined;
  kind?: "image" | "file" | undefined;
  maxCount?: number | undefined;
}): ReactNode {
  const fileList = useMemo(() => valueToFiles(value), [value]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const customRequest: UploadProps["customRequest"] = async ({ file, onError, onSuccess }) => {
    try {
      const result = await generatedUploadFile(file as File);
      const next = maxCount === 1
        ? [result.url]
        : [...fileList.map((item) => item.url).filter((item): item is string => Boolean(item)), result.url].slice(-maxCount);
      onChange?.(next.join(","));
      onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("上传失败"));
    }
  };
  const common: UploadProps = {
    ...(kind === "image" ? { accept: "image/*" } : {}),
    disabled,
    fileList,
    maxCount,
    customRequest,
    onPreview: (file) => {
      if (kind === "image") {
        setPreviewUrl(file.url || file.thumbUrl || null);
      }
    },
    onRemove: (file) => {
      onChange?.(fileList.filter((item) => item.uid !== file.uid).map((item) => item.url).filter(Boolean).join(","));
      return true;
    },
  };

  if (kind === "file") {
    return (
      <Upload {...common}>
        <Button disabled={disabled} icon={<UploadCloud size={15} />}>选择文件</Button>
      </Upload>
    );
  }
  return (
    <>
      <Upload {...common} listType="picture-card">
        {fileList.length >= maxCount ? null : <span className="generated-upload-trigger"><Plus size={18} />上传图片</span>}
      </Upload>
      <Modal
        open={Boolean(previewUrl)}
        footer={null}
        title="图片预览"
        onCancel={() => setPreviewUrl(null)}
        destroyOnHidden
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="图片预览"
            style={{ display: "block", width: "100%", maxHeight: "70vh", objectFit: "contain" }}
          />
        ) : null}
      </Modal>
    </>
  );
}
