import {
  Fragment,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { NavLink } from "react-router";
import type { ClientSession } from "@aicp/auth";
import { Button, Empty, Flex, Typography } from "antd";
import { ChevronLeft, ChevronRight, ChevronUp, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";

import { AuthShell } from "../auth/index";
import { externalNavigation, hasRoutePermission, navigationRoutes, paths } from "../routes";
import { PersonalCenterModal } from "./personal-center";
import { GENERATED_BRANDING } from "../generated-branding";

const { Text } = Typography;

// 侧边栏分组名：与 routes.ts 的 navigation.group 一一对应（路由新增分组时同步扩展）。
const NAV_GROUP_LABELS = {
  overview: "工作台",
  operations: "预约履约",
  content: "内容运营",
  risk: "平台风控",
  governance: "账号与权限",
} as const;

const sidebarStorageKey = (tenantSlug: string): string =>
  `aicp-admin-sidebar-collapsed:${tenantSlug}`;

export function useSidebarCollapsed(
  tenantSlug: string,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(sidebarStorageKey(tenantSlug)) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(window.localStorage.getItem(sidebarStorageKey(tenantSlug)) === "true");
  }, [tenantSlug]);

  const setCollapsedAndPersist = useCallback<Dispatch<SetStateAction<boolean>>>(
    (nextValue) => {
      setCollapsed((currentValue) => {
        const nextCollapsed = typeof nextValue === "function" ? nextValue(currentValue) : nextValue;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(sidebarStorageKey(tenantSlug), String(nextCollapsed));
        }
        return nextCollapsed;
      });
    },
    [tenantSlug],
  );

  return [collapsed, setCollapsedAndPersist];
}

export function AccessDeniedView({
  onLogout,
  tenantSlug,
}: {
  onLogout: () => void;
  tenantSlug: string;
}): ReactNode {
  return (
    <AuthShell state="error">
      <header className="auth-action-header">
        <span className="auth-state-icon auth-state-icon--error" aria-hidden="true">
          <ShieldCheck size={21} />
        </span>
        <h1>当前账号无此页面权限</h1>
        <p>请使用具有相应权限的企业管理员账号，或退出后更换账号。</p>
      </header>
      <Button type="primary" className="auth-denied-action" onClick={onLogout}>
        退出并返回登录
      </Button>
    </AuthShell>
  );
}

export function Sidebar({
  collapsed,
  session,
  tenantSlug,
  onLogout,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
  onToggleCollapsed: () => void;
}): ReactNode {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [personalCenterOpen, setPersonalCenterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const routePaths = paths(tenantSlug);
  const accountInitial = session.account.loginName.slice(0, 1).toUpperCase();
  const visibleRoutes = navigationRoutes.filter((route) => hasRoutePermission(route, session));
  const ExternalIcon = externalNavigation.icon;
  const tenantName = session.tenant?.organizationName ?? tenantSlug;
  const accountRole = roleLabel(session.account.roles);
  const accountAriaLabel = `当前账号：${session.account.loginName}，角色：${accountRole}，租户：${tenantName}`;

  useEffect(() => {
    if (collapsed) setAccountMenuOpen(false);
  }, [collapsed]);

  const closeMobileNavigation = useCallback((restoreFocus = false): void => {
    setMobileOpen(false);
    setAccountMenuOpen(false);
    if (restoreFocus) mobileMenuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    const firstNavigationItem = sidebar?.querySelector<HTMLElement>(".nav-item");
    firstNavigationItem?.focus();

    function handleMobileNavigationKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation(true);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;

      const focusableElements = Array.from(
        sidebar.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((element) => element.offsetParent !== null);
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleMobileNavigationKeyDown);
    return () => document.removeEventListener("keydown", handleMobileNavigationKeyDown);
  }, [closeMobileNavigation, mobileOpen]);

  return (
    <>
      <div className="mobile-admin-bar">
        <div className="admin-brand">
          <div className="admin-brand__copy">
            <strong>{GENERATED_BRANDING.systemTitle}</strong>
            <small>{GENERATED_BRANDING.headerTitle}</small>
          </div>
        </div>
        <button
          type="button"
          ref={mobileMenuButtonRef}
          aria-controls="admin-sidebar"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "关闭菜单" : "打开菜单"}
          onClick={() => {
            if (mobileOpen) {
              closeMobileNavigation(true);
            } else {
              setMobileOpen(true);
            }
          }}
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      <button
        className={`sidebar-scrim${mobileOpen ? " is-visible" : ""}`}
        type="button"
        aria-label="关闭菜单"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => closeMobileNavigation(true)}
      />
      <aside
        ref={sidebarRef}
        id="admin-sidebar"
        className={`sidebar${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="管理端侧边导航"
      >
        <div className="admin-brand">
          <div className="admin-brand__copy">
            <strong>{GENERATED_BRANDING.systemTitle}</strong>
            <small>{GENERATED_BRANDING.headerTitle}</small>
          </div>
        </div>
        <nav aria-label="管理端导航">
          {visibleRoutes.map((route, index) => {
            const Icon = route.navigation.icon;
            const previousGroup = visibleRoutes[index - 1]?.navigation.group;
            const startsGroup = previousGroup !== route.navigation.group;
            return (
              <Fragment key={route.id}>
                {startsGroup ? (
                  <span className="nav-label">{NAV_GROUP_LABELS[route.navigation.group]}</span>
                ) : null}
                <NavLink
                  className={({ isActive }) => `nav-item${isActive ? " nav-item--active" : ""}`}
                  to={`${routePaths.root}/${route.path}`}
                  aria-label={route.navigation.label}
                  data-tooltip={route.navigation.label}
                  onClick={() => closeMobileNavigation(true)}
                >
                  <Icon size={18} />
                  <span>{route.navigation.label}</span>
                </NavLink>
              </Fragment>
            );
          })}
          {externalNavigation.enabled && hasRoutePermission(
            { roles: [...externalNavigation.roles] },
            session,
          ) ? (
          <a
            className="nav-item"
            href={externalNavigation.href}
            target="_blank"
            rel="noreferrer"
            aria-label={externalNavigation.label}
            data-tooltip={externalNavigation.label}
            onClick={() => closeMobileNavigation(true)}
          >
            <ExternalIcon size={18} />
            <span>{externalNavigation.label}</span>
          </a>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            type="button"
            aria-controls="admin-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "展开菜单" : "收起菜单"}
            title={collapsed ? "展开菜单" : "收起菜单"}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{collapsed ? "展开菜单" : "收起菜单"}</span>
          </button>
          <div
            className={`sidebar-account-wrap${accountMenuOpen ? " is-open" : ""}`}
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                setAccountMenuOpen(false);
            }}
          >
            <button
              className="sidebar-account"
              type="button"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label={accountAriaLabel}
              title={accountAriaLabel}
              onClick={() => setAccountMenuOpen((current) => !current)}
            >
              <span className="account-avatar">{accountInitial}</span>
              <span className="account-copy">
                <strong>{session.account.loginName}</strong>
                <small>{accountRole}</small>
              </span>
              <ChevronUp className="account-chevron" size={14} />
            </button>
            <div
              className={`account-menu${accountMenuOpen ? " is-open" : ""}`}
              aria-label="账号菜单"
              aria-hidden={!accountMenuOpen}
              inert={!accountMenuOpen}
            >
              <div className="account-tenant">
                <span>{tenantSlug.slice(0, 2).toUpperCase()}</span>
                <strong>{tenantName}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPersonalCenterOpen(true);
                  setAccountMenuOpen(false);
                }}
              >
                <UserRound size={15} />
                <span>个人中心</span>
              </button>
              <button type="button" onClick={onLogout}>
                <LogOut size={15} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <PersonalCenterModal
        open={personalCenterOpen}
        session={session}
        tenantSlug={tenantSlug}
        onClose={() => setPersonalCenterOpen(false)}
        onPasswordChanged={onLogout}
      />
    </>
  );
}

function roleLabel(roles: ClientSession["account"]["roles"]): string {
  if (roles.includes("platform-administrator")) return "平台管理员";
  if (roles.includes("azhou") || roles.includes("admin")) return "管理员";
  if (roles.includes("editor")) return "编辑";
  if (roles.includes("client") || roles.includes("learner")) return "普通用户";
  if (roles.includes("enterprise-administrator") && roles.includes("training-operator")) {
    return "平台管理员 · 分析运营者";
  }
  if (roles.includes("enterprise-administrator")) return "企业管理员";
  if (roles.includes("training-operator")) return "分析运营者";
  return roles[0] ?? "当前账号";
}

/**
 * 管理端页面共享布局：侧边导航 + 内容区 + 可选覆盖层（Drawer 等）的单一实现。
 * 各页面只提供内容区（main 的 className 与子内容）与覆盖层，不再逐页复制 admin-shell 接线。
 */
export function AdminPageLayout({
  mainClassName,
  mainId,
  session,
  tenantSlug,
  onLogout,
  children,
  overlay,
}: {
  mainClassName: string;
  /** 内容区 id（如 tasks 页面供测试与锚点定位使用）。 */
  mainId?: string;
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
  children: ReactNode;
  /** 渲染在内容区之后的覆盖层（Drawer/Modal 等），仍属于布局 shell。 */
  overlay?: ReactNode;
}): ReactNode {
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarCollapsed(tenantSlug);
  return (
    <div className={`admin-shell${sidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        session={session}
        tenantSlug={tenantSlug}
        onLogout={onLogout}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <main className={mainClassName} id={mainId}>
        {children}
      </main>
      {overlay}
    </div>
  );
}

/** 平台端复用企业端视觉外壳，仅替换导航信息架构。 */
export function PlatformPageLayout({
  session,
  onLogout,
  children,
  overlay,
}: {
  session: ClientSession;
  onLogout: () => void;
  children: ReactNode;
  overlay?: ReactNode;
}): ReactNode {
  const [collapsed, setCollapsed] = useSidebarCollapsed("platform");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const initial = session.account.loginName.slice(0, 1).toUpperCase();
  return (
    <div className={`admin-shell${collapsed ? " is-sidebar-collapsed" : ""}`}>
      <aside id="admin-sidebar" className="sidebar" aria-label="平台管理侧边导航">
        <div className="admin-brand">
          <div className="admin-brand__copy">
            <strong>{GENERATED_BRANDING.systemTitle}</strong>
            <small>{GENERATED_BRANDING.headerTitle}</small>
          </div>
        </div>
        <nav aria-label="平台管理导航">
          <span className="nav-label">平台治理</span>
          <NavLink
            className={({ isActive }) => `nav-item${isActive ? " nav-item--active" : ""}`}
            to="/platform/tenants"
            data-tooltip="租户管理"
          >
            <ShieldCheck size={18} />
            <span>租户管理</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button
            className="sidebar-toggle"
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span>{collapsed ? "展开菜单" : "收起菜单"}</span>
          </button>
          <div
            className={`sidebar-account-wrap${accountMenuOpen ? " is-open" : ""}`}
            onMouseEnter={() => setAccountMenuOpen(true)}
            onMouseLeave={() => setAccountMenuOpen(false)}
          >
            <button
              className="sidebar-account"
              type="button"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((current) => !current)}
            >
              <span className="account-avatar">{initial}</span>
              <span className="account-copy">
                <strong>{session.account.loginName}</strong>
                <small>平台管理员</small>
              </span>
              <ChevronUp className="account-chevron" size={14} />
            </button>
            <div className={`account-menu${accountMenuOpen ? " is-open" : ""}`}>
              <div className="account-tenant">
                <span>平台</span>
                <strong>平台管理控制台</strong>
              </div>
              <button type="button" onClick={onLogout}>
                <LogOut size={15} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="task-workspace platform-tenants-workspace">{children}</main>
      {overlay}
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  session,
  tenantSlug,
  onLogout,
}: {
  title: string;
  description: string;
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  return (
    <AdminPageLayout
      mainClassName="task-workspace admin-route-placeholder"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <header className="workspace-header">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      <Empty
        className="empty-state"
        description={
          <Flex vertical gap={4}>
            <Text strong>{title}页面模块已建立</Text>
            <Text type="secondary">{description}</Text>
          </Flex>
        }
      />
    </AdminPageLayout>
  );
}
