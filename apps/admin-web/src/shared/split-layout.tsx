import { type ReactNode, type Ref } from "react";

import "./split-layout.css";

export interface SplitPanelProps {
  /** 面板头部：48px 单行工具栏（标题 + 计数 + 操作），不要放 SectionHeading。 */
  header?: ReactNode;
  /** 面板主要内容（自动支持区域独立纵向滚动） */
  children: ReactNode;
  /** 底部操作栏/工具栏 */
  footer?: ReactNode;
  /** 面板根节点 ref，用于需要测量面板高度的全高布局。 */
  panelRef?: Ref<HTMLElement>;
  className?: string;
  "aria-label"?: string;
}

export function SplitPanel({
  header,
  children,
  footer,
  panelRef,
  className,
  "aria-label": ariaLabel,
}: SplitPanelProps): ReactNode {
  return (
    <section
      className={`split-layout__panel${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
      ref={panelRef}
    >
      {header ? <div className="split-layout__panel-header">{header}</div> : null}
      <div className="split-layout__panel-content">{children}</div>
      {footer ? <div className="split-layout__panel-footer">{footer}</div> : null}
    </section>
  );
}

export interface SplitLayoutProps {
  /** 左侧面板（或主面板） */
  left: ReactNode;
  /** 右侧面板（或明细面板） */
  right: ReactNode;
  /** 左侧宽度，默认 "300px" */
  leftWidth?: string | number;
  className?: string;
  "aria-label"?: string;
}

/**
 * 主从双栏治理母版容器（SplitLayout）：
 * 用于组织架构管理、权限配置树、主从关联等全高分栏场景。
 * 左右面板均拥有独立内部滚动能力，移动端自动堆叠。
 */
export function SplitLayout({
  left,
  right,
  leftWidth = "300px",
  className,
  "aria-label": ariaLabel,
}: SplitLayoutProps): ReactNode {
  const widthStyle = typeof leftWidth === "number" ? `${leftWidth}px` : leftWidth;
  return (
    <div
      className={`split-layout${className ? ` ${className}` : ""}`}
      style={{ gridTemplateColumns: `${widthStyle} 1fr` }}
      aria-label={ariaLabel}
    >
      {left}
      {right}
    </div>
  );
}

SplitLayout.Panel = SplitPanel;
