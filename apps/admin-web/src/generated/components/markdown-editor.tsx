import MDEditor from "@uiw/react-md-editor";
import type { ReactNode } from "react";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "./text-editors.css";

export function MarkdownEditor({ value, onChange, disabled = false }: {
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  disabled?: boolean | undefined;
}): ReactNode {
  return (
    <div className="generated-markdown-editor" data-color-mode="light">
      <MDEditor
        value={value ?? ""}
        height={320}
        preview={disabled ? "preview" : "live"}
        hideToolbar={disabled}
        visibleDragbar={!disabled}
        textareaProps={{ disabled, placeholder: "请输入 Markdown 内容" }}
        onChange={(next) => onChange?.(next ?? "")}
      />
    </div>
  );
}
