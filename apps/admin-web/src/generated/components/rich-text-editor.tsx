import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Tooltip } from "antd";
import {
  Bold,
  Code2,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import "./text-editors.css";

export function RichTextEditor({ value, onChange, disabled = false }: {
  value?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  disabled?: boolean | undefined;
}): ReactNode {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    ],
    content: value || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange?.(current.isEmpty ? "" : current.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const next = value || "";
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="generated-editor generated-editor--loading">编辑器加载中…</div>;

  const addLink = (): void => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("请输入链接地址", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };
  const tools = [
    { title: "加粗", icon: <Bold size={15} />, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { title: "斜体", icon: <Italic size={15} />, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { title: "下划线", icon: <Underline size={15} />, active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run() },
    { title: "删除线", icon: <Strikethrough size={15} />, active: editor.isActive("strike"), action: () => editor.chain().focus().toggleStrike().run() },
    { title: "二级标题", icon: <Heading2 size={15} />, active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: "无序列表", icon: <List size={15} />, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { title: "有序列表", icon: <ListOrdered size={15} />, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    { title: "引用", icon: <Quote size={15} />, active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { title: "代码块", icon: <Code2 size={15} />, active: editor.isActive("codeBlock"), action: () => editor.chain().focus().toggleCodeBlock().run() },
    { title: "链接", icon: <Link2 size={15} />, active: editor.isActive("link"), action: addLink },
  ];

  return (
    <div className={`generated-editor${disabled ? " generated-editor--disabled" : ""}`}>
      <div className="generated-editor__toolbar" aria-label="富文本工具栏">
        {tools.map((tool) => (
          <Tooltip key={tool.title} title={tool.title}>
            <Button type={tool.active ? "primary" : "text"} size="small" icon={tool.icon} disabled={disabled} onClick={tool.action} />
          </Tooltip>
        ))}
        <span className="generated-editor__toolbar-spacer" />
        <Tooltip title="撤销"><Button type="text" size="small" icon={<Undo2 size={15} />} disabled={disabled || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} /></Tooltip>
        <Tooltip title="重做"><Button type="text" size="small" icon={<Redo2 size={15} />} disabled={disabled || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} /></Tooltip>
      </div>
      <EditorContent editor={editor} className="generated-editor__content" />
    </div>
  );
}
