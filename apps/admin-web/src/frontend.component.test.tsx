import { App as AntApp } from "antd";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vite-plus/test";

import { App } from "./App";
import { LoginView, PasswordChangeView } from "./auth/index";
import { AccessDeniedView } from "./shared/shell";

describe("管理端认证界面", () => {
  test("公开入口路由到登录界面", () => {
    const html = renderToStaticMarkup(
      <AntApp>
        <MemoryRouter initialEntries={["/admin/login"]}>
          <App />
        </MemoryRouter>
      </AntApp>,
    );

    expect(html).toContain("进入系统");
    expect(html).toContain("管理员和普通用户使用同一登录页");
    expect(html).toContain("登录");
    expect(html).toContain('class="auth-card"');
    expect(html).not.toContain("企业编码");
    expect(html).not.toContain("登录页布局方案");
    expect(html).not.toContain("auth-context-panel");
    expect(html).not.toContain("auth-boundary-strip");
  });

  test("登录页不要求企业编码，管理员和普通用户同一入口", () => {
    const html = renderToStaticMarkup(
      <LoginView onAuthenticated={() => undefined} />,
    );

    expect(html).not.toContain("企业编码");
    expect(html).toContain('aria-label="用户名"');
    expect(html).toContain('aria-label="密码"');
    expect(html).toContain('aria-label="验证码"');
    expect(html).toContain("忘记密码？请联系管理员。");
    expect(html).toContain("登录");
  });

  test("首次登录改密页和权限拒绝页保留恢复动作", () => {
    const passwordHtml = renderToStaticMarkup(
      <PasswordChangeView tenantSlug="acme" onChanged={() => undefined} />,
    );
    const deniedHtml = renderToStaticMarkup(
      <AccessDeniedView tenantSlug="acme" onLogout={() => undefined} />,
    );

    expect(passwordHtml).toContain("设置个人密码");
    expect(passwordHtml).toContain("设置并重新登录");
    expect(deniedHtml).toContain("当前账号无此页面权限");
    expect(deniedHtml).toContain("退出并返回登录");
  });

});
