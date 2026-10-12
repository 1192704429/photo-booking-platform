import type { ClientSession } from "@aicp/auth";
import { createPortalRouting } from "@aicp/auth/portal-routing";

// 租户地址解析、会话键与角色守卫的唯一实现在共享 portal 路由 module（ADR 0005）；
// portal 实例同时承载会话失效兜底（清除本端会话、跳转登录页），应用入口统一使用。
export const portal = createPortalRouting("admin");
import {
  BarChart3,
  Camera,
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  MessageSquare,
  PackageOpen,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  Table2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { generatedProjectConfig } from "./generated/project-config";
import type { GeneratedMenu } from "./generated/types";

export const publicLoginPath = portal.publicLoginPath;

export type RouteId =
  | `generated-${string}`
  | "login"
  | "change-password"
  | "dashboard"
  | "users"
  | "photographers"
  | "tables"
  | "charts"
  | "form"
  | "nested-ai"
  | "nested-chat";

export type RouteAccess = "public" | "password-change" | "protected";
export type RouteRole = ClientSession["account"]["roles"][number];
export type NavigationGroup = "overview" | "operations" | "content" | "risk" | "governance";

export interface RouteDefinition {
  id: RouteId;
  path: string;
  access: RouteAccess;
  roles?: readonly RouteRole[];
  navigation?: {
    group: NavigationGroup;
    label: string;
    icon: LucideIcon;
    href?: string;
  };
}

const adminRoles = [
  "enterprise-administrator",
  "azhou",
  "admin",
] as const;
const operationsRoles = [
  ...adminRoles,
  "training-operator",
] as const;
const contentRoles = [
  ...adminRoles,
  "editor",
] as const;
const staffRoles = [...operationsRoles, "editor"] as const;

const builtInRouteConfig: readonly RouteDefinition[] = [
  { id: "login", path: "login", access: "public" },
  { id: "change-password", path: "change-password", access: "password-change" },
  {
    id: "dashboard",
    path: "dashboard",
    access: "protected",
    roles: staffRoles,
    navigation: { group: "overview", label: "首页", icon: LayoutDashboard },
  },
  {
    id: "users",
    path: "users",
    access: "protected",
    roles: operationsRoles,
    navigation: { group: "governance", label: "用户管理", icon: Users },
  },
  {
    id: "photographers",
    path: "photographers",
    access: "protected",
    roles: staffRoles,
    navigation: { group: "governance", label: "摄影师管理", icon: Camera },
  },
  {
    id: "tables",
    path: "tables",
    access: "protected",
    roles: contentRoles,
    navigation: { group: "content", label: "数据表格", icon: Table2 },
  },
  {
    id: "charts",
    path: "charts",
    access: "protected",
    roles: adminRoles,
    navigation: { group: "overview", label: "分析图表", icon: BarChart3 },
  },
  {
    id: "form",
    path: "form",
    access: "protected",
    roles: contentRoles,
    navigation: { group: "content", label: "表单工具", icon: FileText },
  },
  {
    id: "nested-ai",
    path: "nested/ai",
    access: "protected",
    roles: contentRoles,
    navigation: { group: "content", label: "AI 问答", icon: Sparkles },
  },
  {
    id: "nested-chat",
    path: "nested/chat",
    access: "protected",
    roles: adminRoles,
    navigation: { group: "governance", label: "内部沟通", icon: MessageSquare },
  },
];

const curatedBusinessMenus: readonly (GeneratedMenu & {
  group: NavigationGroup;
  icon: LucideIcon;
})[] = [
  { id: "generated-shoot-order", path: "orders", title: "订单管理", tableKey: "shoot_order", roles: [...operationsRoles], group: "operations", icon: ShoppingBag },
  { id: "generated-photography-work", path: "works", title: "作品管理", tableKey: "photography_work", roles: [...contentRoles], group: "content", icon: Images },
  { id: "generated-photography-package", path: "packages", title: "套餐管理", tableKey: "photography_package", roles: [...contentRoles], group: "content", icon: PackageOpen },
  { id: "generated-order-review", path: "reviews", title: "评价管理", tableKey: "order_review", roles: [...contentRoles], group: "content", icon: Star },
  { id: "generated-complaint-record", path: "complaints", title: "举报投诉", tableKey: "complaint_record", roles: [...operationsRoles], group: "risk", icon: ShieldAlert },
];

const curatedMenuIds = new Set(curatedBusinessMenus.map((menu) => menu.id));

export const generatedRouteConfig: readonly RouteDefinition[] = [
  ...curatedBusinessMenus,
  ...generatedProjectConfig.menus.filter((menu) => !curatedMenuIds.has(menu.id)),
].map((menu) => {
  const curated = curatedBusinessMenus.find((item) => item.id === menu.id);
  const route: RouteDefinition = {
    id: menu.id as RouteId,
    path: menu.path,
    access: "protected",
    navigation: {
      group: curated?.group ?? "content",
      label: menu.title,
      icon: curated?.icon ?? FileText,
    },
  };
  if (menu.roles?.length) route.roles = menu.roles as readonly RouteRole[];
  return route;
});

export const routeConfig: readonly RouteDefinition[] = [
  ...builtInRouteConfig.filter((route) =>
    ["login", "change-password", "dashboard", "users", "photographers"].includes(route.id),
  ),
  ...generatedRouteConfig,
];

export function generatedMenuByRouteId(id: RouteId) {
  return curatedBusinessMenus.find((menu) => menu.id === id)
    ?? generatedProjectConfig.menus.find((menu) => menu.id === id);
}

export const externalNavigation = {
  enabled: !generatedProjectConfig.generated,
  group: "business" as const,
  label: "外部文档",
  icon: ExternalLink,
  href: "https://ant.design/components/overview-cn",
  roles: ["admin", "editor", "azhou", "enterprise-administrator"] as const,
};

export const navigationRoutes = routeConfig.filter(
  (route): route is RouteDefinition & { navigation: NonNullable<RouteDefinition["navigation"]> } =>
    route.navigation !== undefined,
);

export const hasRoutePermission = (
  ...args: Parameters<typeof portal.hasRoutePermission>
): ReturnType<typeof portal.hasRoutePermission> => portal.hasRoutePermission(...args);
export const resolveTenantSlug = (
  ...args: Parameters<typeof portal.resolveTenantSlug>
): ReturnType<typeof portal.resolveTenantSlug> => portal.resolveTenantSlug(...args);
export const sessionKey = (
  ...args: Parameters<typeof portal.sessionKey>
): ReturnType<typeof portal.sessionKey> => portal.sessionKey(...args);

/** 从 routeConfig 派生的租户路径投影：新增路由只需在 routeConfig 声明一次。 */
export function paths(tenantSlug: string): {
  root: string;
  login: string;
  changePassword: string;
  dashboard: string;
  users: string;
  photographers: string;
  tables: string;
  charts: string;
  form: string;
  nestedAi: string;
  nestedChat: string;
} {
  const root = "/admin";
  const byId = Object.fromEntries(
    routeConfig.map((route) => [route.id, `${root}/${route.path}`]),
  ) as Record<RouteId, string>;
  return {
    root,
    login: byId.login,
    changePassword: byId["change-password"],
    dashboard: byId.dashboard,
    users: byId.users,
    photographers: byId.photographers,
    tables: byId.tables,
    charts: byId.charts,
    form: byId.form,
    nestedAi: byId["nested-ai"],
    nestedChat: byId["nested-chat"],
  };
}
