import type { ClientSession } from "./auth-models";

/** 企业门户标识：管理端与学员端。 */
export type PortalName = "admin" | "learn";

/** 路由声明的最小角色守卫形状。 */
export interface PortalRouteGuard {
  roles?: readonly string[];
}

/** 会话清理所需的最小存储抽象：仅枚举与删除，测试可用最小伪存储。 */
export interface SessionStorage {
  removeItem(key: string): void;
  [key: string]: unknown;
}

/**
 * 双端租户会话路由 module —— 唯一拥有“企业登录地址 → 租户 slug → 会话键 →
 * 角色守卫 → 会话失效兜底”规则的地方（ADR 0005 租户路径前缀方案）。管理端与
 * 学员端只声明各自的路由表与 portal 标识，地址解析、会话键与会话生命周期机制
 * 不再双处实现。
 */
export interface PortalRouting {
  portal: PortalName;
  /** 登录页路径（无租户前缀）。 */
  publicLoginPath: string;
  /** 从 URL 解析租户 slug：首段为租户、第二段必须匹配本 portal 前缀。 */
  resolveTenantSlug(pathname: string): string | undefined;
  /** 会话存储键：portal + 租户隔离，双端互不串扰。 */
  sessionKey(tenantSlug: string): string;
  /** 清除本 portal 全部租户会话键：会话失效兜底时本地元数据已不可信，一并作废。 */
  purgeSessions(storage: SessionStorage): void;
  /** 会话失效跳转登录页 URL（当前租户登录页或公开登录页，带 reason=session-expired）。 */
  sessionExpiredUrl(pathname: string): string;
  /** 登录页 reason 参数为 session-expired 时的提示文案；无 window 环境（SSR/测试）安全返回 undefined。 */
  sessionExpiredNotice(): string | undefined;
  /** 角色守卫：路由未声明角色或会话角色命中即放行。 */
  hasRoutePermission(route: PortalRouteGuard, session: ClientSession): boolean;
  /** 租户前缀根路径。 */
  rootFor(tenantSlug: string): string;
}

export function createPortalRouting(portal: PortalName): PortalRouting {
  const portalSegment = portal;
  // 会话键前缀沿用既有命名：learner 端历史键为 aicp-learner-session:*，与 URL 段 learn 不同。
  const sessionPrefix = portal === "admin" ? "admin" : "learner";
  // 租户 slug 解析闭包：resolveTenantSlug 与 sessionExpiredUrl 共用，避免依赖 this。
  const resolveTenant = (pathname: string): string | undefined => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2 || segments[1] !== portalSegment) {
      return undefined;
    }
    return segments[0];
  };
  return {
    portal,
    publicLoginPath: `/${portalSegment}/login`,
    resolveTenantSlug(pathname: string): string | undefined {
      return resolveTenant(pathname);
    },
    sessionKey(tenantSlug: string): string {
      return `aicp-${sessionPrefix}-session:${tenantSlug}`;
    },
    purgeSessions(storage: SessionStorage): void {
      for (const key of Object.keys(storage)) {
        if (key.startsWith(`aicp-${sessionPrefix}-session:`)) {
          storage.removeItem(key);
        }
      }
    },
    sessionExpiredUrl(pathname: string): string {
      const tenantSlug = resolveTenant(pathname);
      const loginPath = tenantSlug
        ? `/${encodeURIComponent(tenantSlug)}/${portalSegment}/login`
        : `/${portalSegment}/login`;
      return `${loginPath}?reason=session-expired`;
    },
    sessionExpiredNotice(): string | undefined {
      if (typeof window === "undefined") {
        return undefined;
      }
      return new URLSearchParams(window.location.search).get("reason") === "session-expired"
        ? "登录已过期，请重新登录"
        : undefined;
    },
    hasRoutePermission(route: PortalRouteGuard, session: ClientSession): boolean {
      return (
        route.roles === undefined ||
        session.account.roles.some((role) => route.roles?.includes(role))
      );
    },
    rootFor(tenantSlug: string): string {
      return `/${encodeURIComponent(tenantSlug)}/${portalSegment}`;
    },
  };
}
