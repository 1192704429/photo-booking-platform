import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

/**
 * 深链定位（跨页面共享）：
 * - useDeepLocate：读取并消费一次性 query 参数（如 ?material=uuid），
 *   页面数据加载完成后返回目标实体 id（仿 resources ?create= 先例：ref 守卫 + loading 门控）；
 * - useLocateHighlight：定位高亮以渲染状态输出（class 写在 JSX 里）。不能直接在
 *   effect 里 classList.add——setSearchParams 走 React Router 的 startTransition，
 *   参数清理后的低优先级渲染会重建列表 DOM，把手动添加的 class 抹掉；
 * - scrollToEntityRow：把目标行滚动到可视区，与 useLocateHighlight 配合使用
 *   （滚动依赖高亮 id 就绪，保证过滤已清空、目标行已渲染）。
 */
export function useDeepLocate(param: string, loading: boolean): string | undefined {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locatedId, setLocatedId] = useState<string>();
  const handledRef = useRef(false);
  useEffect(() => {
    if (handledRef.current || loading) return;
    const id = searchParams.get(param);
    if (!id) return;
    handledRef.current = true;
    setLocatedId(id);
    setSearchParams((current) => {
      current.delete(param);
      return current;
    });
  }, [param, loading, searchParams, setSearchParams]);
  return locatedId;
}

const HIGHLIGHT_MS = 2400;

/** 定位高亮：返回当前高亮中的实体 id，页面渲染行时比对输出 is-located，约 2.4s 后清除。 */
export function useLocateHighlight(targetId: string | undefined): string | undefined {
  const [highlightId, setHighlightId] = useState<string | undefined>(targetId);
  useEffect(() => {
    if (!targetId) return;
    setHighlightId(targetId);
    const timer = window.setTimeout(() => setHighlightId(undefined), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [targetId]);
  return highlightId;
}

/** 定位实体行：滚动到可视区（antd Table 行用 data-row-key 兜底）。 */
export function scrollToEntityRow(id: string): void {
  document
    .querySelector<HTMLElement>(`[data-entity-id="${id}"], [data-row-key="${id}"]`)
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** 定位行合成 hook：读取并消费一次性 query 参数 → 高亮 → 滚动（列表页实体链接入口）。 */
export function useLocateRow(param: string, loading: boolean): string | undefined {
  const locatedId = useDeepLocate(param, loading);
  const highlightId = useLocateHighlight(locatedId);
  useEffect(() => {
    if (highlightId) scrollToEntityRow(highlightId);
  }, [highlightId]);
  return highlightId;
}
