import { ApiError } from "./common";
import { resolveBrowserApiEndpoint } from "./browser-endpoint";
import type { LoginResponse } from "@aicp/contracts";
import {
  clearAccessToken,
  getAccessToken,
  persistAccessToken,
} from "./access-token";

export {
  clearAccessToken,
  getAccessToken,
  getAuthKind,
  persistAccessToken,
} from "./access-token";

/** 与后端 spring.application.name / 原 Vue 模板一致，作为密码 SHA-256 盐值。 */
export const passwordSalt = "photo_booking_system";
const adminLoginTable = "sys_admin";
const adminLoginBasePath = `/${adminLoginTable}/login`;

export async function encryptPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${passwordSalt}${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

interface JavaResult {
  code?: number;
  msg?: string;
  data?: unknown;
}

function apiUrl(path: string): string {
  return `${resolveBrowserApiEndpoint()}${path}`;
}

async function readResult(response: Response, fallback: string): Promise<JavaResult> {
  const result = (await response.json().catch(() => undefined)) as JavaResult | undefined;
  if (!result) {
    throw new ApiError(response.status || 502, "unavailable", fallback);
  }
  return result;
}

async function postJson(path: string, body: unknown, token?: string): Promise<JavaResult> {
  let response: Response;
  try {
    const headers = new Headers({ "content-type": "application/json" });
    if (token) headers.set("Authorization", token);
    response = await fetch(apiUrl(path), {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(502, "unavailable", "无法连接登录服务，请确认后端已启动");
  }
  return readResult(response, "无法连接登录服务，请确认后端已启动");
}

async function getJson(path: string, token?: string): Promise<JavaResult> {
  let response: Response;
  try {
    const headers = new Headers();
    if (token) headers.set("Authorization", token);
    response = await fetch(apiUrl(path), {
      method: "GET",
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError(502, "unavailable", "无法连接登录服务，请确认后端已启动");
  }
  return readResult(response, "无法连接登录服务，请确认后端已启动");
}

function assertOk(result: JavaResult, fallback: string): unknown {
  if (result.code !== 200) {
    const message = result.msg || fallback;
    throw new ApiError(
      result.code === 401 ? 401 : 400,
      classifyLoginError(message),
      message,
    );
  }
  return result.data;
}

function classifyLoginError(message: string): string {
  if (message.includes("用户不存在")) return "user-not-found";
  if (message.includes("验证码")) return "invalid-captcha";
  if (message.includes("密码")) return "invalid-credentials";
  return "invalid-credentials";
}

/** 拉取后端图片验证码（GET /captcha/getCaptcha/{cacheKey}），与原 Vue 模板一样按 blob 展示。 */
export async function fetchCaptchaBlob(captchaKey: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(
      apiUrl(`/captcha/getCaptcha/${encodeURIComponent(captchaKey)}?t=${Date.now()}`),
      { method: "GET", credentials: "include" },
    );
  } catch {
    throw new ApiError(502, "unavailable", "获取验证码失败，请重试");
  }
  if (!response.ok) {
    throw new ApiError(response.status, "unavailable", "获取验证码失败，请重试");
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") && blob.size === 0) {
    throw new ApiError(502, "unavailable", "获取验证码失败，请重试");
  }
  return blob;
}

type SessionRole = LoginResponse["account"]["roles"][number];

function asSessionRole(value: string): SessionRole {
  return value.trim() ? (value as SessionRole) : "azhou";
}

function sessionFromProfile(
  loginName: string,
  profile: { id?: unknown; name?: unknown; avatar?: unknown; role?: unknown; username?: unknown },
): LoginResponse {
  const role = asSessionRole(
    typeof profile.role === "string" && profile.role.trim() ? profile.role.trim() : "azhou",
  );
  const displayName =
    (typeof profile.name === "string" && profile.name) ||
    (typeof profile.username === "string" && profile.username) ||
    loginName;
  return {
    account: {
      id: profile.id,
      loginName: displayName,
      roles: [role],
      mustChangePassword: false,
    } as LoginResponse["account"],
    tenant: {
      organizationName: "默认组织",
      slug: "default",
    },
  };
}

/**
 * 管理端登录：仅走 POST /sys_admin/login + GET /sys_admin/login/info。
 * 用户端登录由 user-web 独立调用 /sys_user/login，不经过本函数。
 * 请求体：username + SHA256(盐 + 密码) + captcha + captchaKey。
 */
export async function login(
  _tenantSlug: string,
  input: { loginName: string; password: string; captcha?: string; captchaKey?: string },
): Promise<LoginResponse> {
  const password = await encryptPassword(input.password);
  const payload = {
    username: input.loginName.trim(),
    password,
    captcha: input.captcha?.trim() ?? "",
    captchaKey: input.captchaKey ?? "",
  };

  const loginData = assertOk(await postJson(adminLoginBasePath, payload), "管理员登录失败");
  const token = typeof loginData === "string" ? loginData : undefined;
  if (!token) throw new ApiError(500, "invalid-credentials", "登录未返回令牌");
  persistAccessToken(token, "admin");
  const info = assertOk(await getJson(`${adminLoginBasePath}/info`, token), "获取管理员信息失败");
  return sessionFromProfile(payload.username, isRecord(info) ? info : {});
}

/** 用本地 token 调管理端 /info，刷新页面后恢复登录态。 */
export async function fetchCurrentSession(): Promise<LoginResponse | undefined> {
  const token = getAccessToken();
  if (!token) return undefined;
  try {
    const info = assertOk(await getJson(`${adminLoginBasePath}/info`, token), "登录状态已过期");
    const profile = isRecord(info) ? info : {};
    const loginName = (typeof profile.name === "string" && profile.name) || "admin";
    return sessionFromProfile(loginName, profile);
  } catch {
    clearAccessToken();
    return undefined;
  }
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) {
      await getJson(`${adminLoginBasePath}/logout`, token);
    }
  } finally {
    clearAccessToken();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
