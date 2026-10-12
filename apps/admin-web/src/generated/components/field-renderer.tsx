import { DatePicker, Image, Input, InputNumber, Radio, Select, Switch, Tag } from "antd";
import dayjs from "dayjs";
import { lazy, Suspense, type ReactNode } from "react";

import type { GeneratedField, GeneratedFieldType, GeneratedOption } from "../types";
import { GeneratedUpload } from "./generated-upload";

const RichTextEditor = lazy(() => import("./rich-text-editor").then((module) => ({ default: module.RichTextEditor })));
const MarkdownEditor = lazy(() => import("./markdown-editor").then((module) => ({ default: module.MarkdownEditor })));

function EditorLoading(): ReactNode {
  return <div className="generated-editor generated-editor--loading">编辑器加载中…</div>;
}

export interface GeneratedFieldControlProps {
  field: GeneratedField;
  options?: GeneratedOption[] | undefined;
  mode?: "edit" | "search" | undefined;
  value?: unknown;
  onChange?: ((value: unknown) => void) | undefined;
  disabled?: boolean | undefined;
}

type ControlRenderer = (props: GeneratedFieldControlProps) => ReactNode;

const editControls: Record<GeneratedFieldType, ControlRenderer> = {
  input: ({ field, value, onChange }) => <Input value={value as string | undefined} onChange={(event) => onChange?.(event.target.value)} allowClear placeholder={`请输入${field.label}`} />,
  textarea: ({ field, value, onChange }) => <Input.TextArea value={value as string | undefined} onChange={(event) => onChange?.(event.target.value)} rows={4} placeholder={`请输入${field.label}`} />,
  select: ({ field, options, value, onChange }) => <Select value={value == null ? value : String(value)} onChange={onChange} allowClear options={options ?? []} placeholder={`请选择${field.label}`} style={{ minWidth: 180 }} />,
  radio: ({ options, value, onChange }) => <Radio.Group value={value == null ? value : String(value)} onChange={onChange} options={options ?? []} />,
  image: ({ value, onChange, disabled }) => <GeneratedUpload value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} />,
  file: ({ value, onChange, disabled }) => <GeneratedUpload value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} kind="file" />,
  date: ({ value, onChange }) => <DatePicker value={value as dayjs.Dayjs | null | undefined} onChange={onChange} showTime style={{ width: "100%" }} />,
  number: ({ value, onChange }) => <InputNumber value={value as number | null | undefined} onChange={onChange} style={{ width: "100%" }} />,
  rich: ({ value, onChange, disabled }) => <Suspense fallback={<EditorLoading />}><RichTextEditor value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} /></Suspense>,
  md: ({ value, onChange, disabled }) => <Suspense fallback={<EditorLoading />}><MarkdownEditor value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} /></Suspense>,
};

const searchControls: Record<NonNullable<GeneratedField["searchType"]>, ControlRenderer> = {
  input: ({ field, value, onChange }) => <Input value={value as string | undefined} onChange={(event) => onChange?.(event.target.value)} allowClear placeholder={`请输入${field.label}`} />,
  select: ({ field, options, value, onChange }) => <Select value={value == null ? value : String(value)} onChange={onChange} allowClear options={options ?? []} placeholder={`请选择${field.label}`} style={{ minWidth: 180 }} />,
  date: ({ value, onChange }) => <DatePicker value={value as dayjs.Dayjs | null | undefined} onChange={onChange} showTime />,
  range: ({ value, onChange }) => <DatePicker.RangePicker value={value as [dayjs.Dayjs, dayjs.Dayjs] | null | undefined} onChange={onChange} showTime />,
};

/** 字段组件注册入口：生成页面只提供字段配置，不直接判断具体 Ant Design 控件。 */
export function GeneratedFieldControl(props: GeneratedFieldControlProps): ReactNode {
  const options = [...(props.field.options ?? []), ...(props.options ?? [])];
  if (props.mode === "search") return searchControls[props.field.searchType ?? "input"]({ ...props, options });
  return editControls[props.field.type]({ ...props, options });
}

const cellRenderers: Partial<Record<GeneratedFieldType, (value: unknown) => ReactNode>> = {
  image: (value) => String(value ?? "").split(",").filter(Boolean).slice(0, 3).map((url) => (
    <Image key={url} width={42} height={42} src={url} style={{ objectFit: "cover", marginRight: 4 }} />
  )),
  file: (value) => <a href={String(value)} target="_blank" rel="noreferrer">查看文件</a>,
  date: (value) => value ? dayjs(String(value)).format("YYYY-MM-DD HH:mm:ss") : "-",
};

export function renderGeneratedCell(field: GeneratedField, value: unknown, dynamicOptions?: GeneratedOption[]): ReactNode {
  const option = [...(field.options ?? []), ...(dynamicOptions ?? [])]
    .find((item) => String(item.value) === String(value));
  if (option) return <Tag>{option.label}</Tag>;
  const renderer = cellRenderers[field.type];
  return renderer ? renderer(value) : String(value ?? "-");
}

/** 个人中心配置也经过同一注册层，兼容历史 component 命名。 */
export function GeneratedProfileControl({ component, options, disabled, value, onChange }: {
  component?: string | undefined;
  options?: GeneratedOption[] | undefined;
  disabled?: boolean | undefined;
  value?: unknown;
  onChange?: ((value: unknown) => void) | undefined;
}): ReactNode {
  if (component === "upload" || component === "image") {
    return <GeneratedUpload value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} />;
  }
  if (component === "select") return <Select value={value} onChange={(next) => onChange?.(next)} allowClear disabled={Boolean(disabled)} options={options ?? []} />;
  if (component === "radio") return <Radio.Group value={value} onChange={(event) => onChange?.(event)} disabled={Boolean(disabled)} options={options ?? []} />;
  if (component === "textarea") return <Input.TextArea value={String(value ?? "")} onChange={(event) => onChange?.(event)} disabled={Boolean(disabled)} rows={4} />;
  if (component === "rich") return <Suspense fallback={<EditorLoading />}><RichTextEditor value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} /></Suspense>;
  if (component === "md" || component === "markdown") return <Suspense fallback={<EditorLoading />}><MarkdownEditor value={String(value ?? "")} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} /></Suspense>;
  if (component === "number") return <InputNumber value={value as number | null} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} style={{ width: "100%" }} />;
  if (component === "switch") return <Switch checked={Boolean(value)} onChange={(next) => onChange?.(next)} disabled={Boolean(disabled)} />;
  return <Input value={String(value ?? "")} onChange={(event) => onChange?.(event)} disabled={Boolean(disabled)} />;
}
