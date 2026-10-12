import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClientSession } from "@aicp/auth";

import {
  hasRoutePermission,
  paths,
  publicLoginPath,
  resolveTenantSlug,
  routeConfig,
  sessionKey,
} from "./routes";

void test("管理端从企业登录地址解析租户", () => {
  assert.equal(resolveTenantSlug("/acme/admin/login"), "acme");
  assert.equal(resolveTenantSlug("/acme/learn/login"), undefined);
  assert.equal(resolveTenantSlug("/admin/login"), undefined);
});

void test("管理端为租户生成稳定路由和会话键", () => {
  assert.equal(publicLoginPath, "/admin/login");
  assert.deepEqual(paths("acme"), {
    root: "/admin",
    login: "/admin/login",
    changePassword: "/admin/change-password",
    dashboard: "/admin/dashboard",
    tables: "/admin/tables",
    charts: "/admin/charts",
    form: "/admin/form",
    nestedAi: "/admin/nested/ai",
    nestedChat: "/admin/nested/chat",
  });
  assert.equal(sessionKey("acme"), "aicp-admin-session:acme");
});

void test("普通用户只能看到首页，管理员按后端角色看到管理菜单", () => {
  const dashboard = routeConfig.find((route) => route.id === "dashboard");
  const form = routeConfig.find((route) => route.id === "form");
  assert.ok(dashboard && form);
  const client = {
    account: {
      loginName: "user",
      roles: ["client"] as ClientSession["account"]["roles"],
      mustChangePassword: false,
    },
  };
  const azhou = {
    account: {
      loginName: "admin",
      roles: ["azhou"] as ClientSession["account"]["roles"],
      mustChangePassword: false,
    },
  };
  assert.equal(hasRoutePermission(dashboard, client), true);
  assert.equal(hasRoutePermission(form, azhou), true);
});

void test("侧边导航包含当前后台功能", () => {
  assert.deepEqual(
    routeConfig.filter((route) => route.navigation).map((route) => route.navigation?.label),
    ["首页", "表格", "图表", "表单", "AI 问答", "聊天 Demo"],
  );
});
