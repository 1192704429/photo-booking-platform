import react from "@vitejs/plugin-react";
import type { Connect, Plugin } from "vite-plus";
import { defineConfig } from "vite-plus";

// 开发/预览态租户路径回退（ADR 0005 租户前缀方案）：SPA 路由是 /{slug}/admin/*，
// 而 dev/preview 服务器 base 为 /admin/（生产由 Caddy 剥离租户前缀后回退 index.html）。
// 直接访问或刷新 /{slug}/admin/* 时，vite 的 base 中间件会先于 SPA fallback 返回
// 404（"public base URL" 报错）；这里按 Caddy 同款规则把租户前缀重写到 /admin/*。
// 仅服务端改写，浏览器地址栏与 react-router 解析的 pathname 均保持不变。
function tenantAdminPathFallback(): Plugin {
  const rewrite = (req: Connect.IncomingMessage): void => {
    // API 请求由 /api 代理转发，不参与租户路径回退
    if (req.url?.startsWith("/api/")) return;
    if (req.url?.startsWith("/platform")) {
      req.url = `/admin${req.url}`;
      return;
    }
    const match = /^\/([^/]+)\/admin(\/.*)?$/.exec(req.url ?? "");
    if (match) {
      req.url = `/admin${match[2] ?? "/"}`;
    }
  };
  return {
    name: "aicp-admin-tenant-path-fallback",
    configureServer(server) {
      // configureServer 内注册的中间件先于 base 中间件执行，改写后才能进入 SPA fallback。
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
  };
}

export default defineConfig({
  // 绝对 base：深层路由刷新时 assets 由 Caddy 按 /admin/ 前缀剥离命中真实文件，
  // 相对 base（"./"）会在深层路径下把 assets 解析到错误目录并被 SPA 回退吞掉。
  base: "/admin/",
  // 根 tsconfig noEmit 阻止 tsc 在源码旁生成 .js 产物（历史遗留产物已清理），
  // 扩展名解析保持 vite 默认；若未来产物再现，先排查 noEmit 失效原因而非加解析顺序规避。
  plugins: [react(), tenantAdminPathFallback()],
  server: {
    port: 4173,
    // 监听 0.0.0.0：本地 API 直连时前端需用 127.0.0.1 访问（与 API 同 host 不同端口，
    // SameSite cookie 才能携带；localhost 与 127.0.0.1 视为不同站）。
    host: "0.0.0.0",
    // 注意：vite-plus dev server 不实现 proxy 转发（含 server.proxy）；
    // 本地 API 直连由 .env.development 的 VITE_API_BASE_URL 提供，最终由
    // packages/api-client/browser-endpoint module 解释（生产仍使用同源相对路径）。
  },
  build: {
    outDir: "dist",
  },
});
