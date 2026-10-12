const TOKEN_KEY = "admin-access-token";
const AUTH_KIND_KEY = "admin-access-kind";

export type TemplateAuthKind = "admin" | "client";

export function getAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function getAuthKind(): TemplateAuthKind | undefined {
  if (typeof window === "undefined") return undefined;
  const value = window.localStorage.getItem(AUTH_KIND_KEY);
  return value === "admin" || value === "client" ? value : undefined;
}

export function persistAccessToken(token: string, kind: TemplateAuthKind): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_KIND_KEY, kind);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(AUTH_KIND_KEY);
}
