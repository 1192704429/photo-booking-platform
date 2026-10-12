import { resolveBrowserApiEndpoint } from "@aicp/api-client/browser-endpoint";
import { getAccessToken } from "@aicp/api-client/template-auth";

interface ResultEnvelope<T> {
  code?: number;
  msg?: string;
  data?: T;
  [key: string]: unknown;
}

export async function generatedRequest<T>(
  path: string,
  method: "DELETE" | "GET" | "POST" | "PUT" = "GET",
  body?: unknown,
): Promise<T> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", token);
  if (body !== undefined) headers.set("content-type", "application/json");
  const request: RequestInit = {
    method,
    credentials: "include",
    headers,
  };
  if (body !== undefined) request.body = JSON.stringify(body);
  const response = await fetch(`${resolveBrowserApiEndpoint()}${path}`, request);
  const result = (await response.json().catch(() => undefined)) as ResultEnvelope<T> | undefined;
  if (!response.ok || !result || result.code !== 200) {
    throw new Error(result?.msg || `请求失败（HTTP ${response.status}）`);
  }
  return result.data as T;
}

export interface GeneratedUploadResult {
  url: string;
  fileName?: string;
  newFileName?: string;
  originalFilename?: string;
}

/** 使用生成项目自带的通用上传接口，浏览器会自动设置 multipart boundary。 */
export async function generatedUploadFile(file: File): Promise<GeneratedUploadResult> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set("Authorization", token);
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${resolveBrowserApiEndpoint()}/common/upload`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  const result = (await response.json().catch(() => undefined)) as ResultEnvelope<GeneratedUploadResult> | undefined;
  if (!response.ok || !result || result.code !== 200) {
    throw new Error(result?.msg || `上传失败（HTTP ${response.status}）`);
  }
  const payload = result.data && typeof result.data === "object" ? result.data : result;
  if (typeof payload.url !== "string" || !payload.url) throw new Error("上传接口未返回文件地址");
  return payload as unknown as GeneratedUploadResult;
}
