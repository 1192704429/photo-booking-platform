import type { LoginResponse } from "@aicp/contracts";

/**
 * 浏览器保存的登录响应快照。它只用于恢复租户路径和界面状态，
 * 不等同于服务端 HttpOnly cookie 的认证事实。
 */
export interface ClientSession {
  account: LoginResponse["account"];
  tenant?: LoginResponse["tenant"];
}
