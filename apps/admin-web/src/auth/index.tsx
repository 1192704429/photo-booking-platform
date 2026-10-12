import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { changePassword } from "@aicp/api-client/common";
import { fetchCaptchaBlob, login } from "@aicp/api-client/template-auth";
import {
  runLoginWorkflow,
  runPasswordChangeWorkflow,
  type AuthClient,
  type ClientSession,
} from "@aicp/auth";
import { Button, Form, Input } from "antd";
import { Check, CircleAlert, KeyRound, LockKeyhole, UserRound } from "lucide-react";

import { portal } from "../routes";
import "./auth.css";
import { GENERATED_BRANDING } from "../generated-branding";
import { generatedProjectConfig } from "../generated/project-config";

type AuthState = "error" | "idle" | "pending" | "secure" | "success";

const authClient: AuthClient = { changePassword, login };
const loginConfig = generatedProjectConfig.loginConfig;
const loginText = (fallback: string, ...keys: string[]): string => {
  for (const key of keys) {
    const value = loginConfig[key];
    if (value?.trim()) return value;
  }
  return fallback;
};

/* 认证背景粒子：慢层漂浮、快层在认证处理中定向流动；位置与节奏由 CSS 变量控制，
   动画只改变 transform，状态切换只经 opacity/color 过渡，避免流位跳变。 */
interface ParticleSpec {
  top: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  dx: number;
  dy: number;
}

/** 基于索引的确定性伪随机，保证每次渲染粒子布局稳定 */
function deterministicRandom(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function buildParticles(
  count: number,
  options: {
    minSize: number;
    maxSize: number;
    minDuration: number;
    maxDuration: number;
    maxDrift: number;
  },
): ParticleSpec[] {
  const specs: ParticleSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    specs.push({
      top: 3 + deterministicRandom(i * 2 + 1) * 92,
      left: 2 + deterministicRandom(i * 2 + 2) * 94,
      size: options.minSize + deterministicRandom(i * 2 + 3) * (options.maxSize - options.minSize),
      duration:
        options.minDuration +
        deterministicRandom(i * 2 + 4) * (options.maxDuration - options.minDuration),
      // 负延迟让粒子分布错开相位，避免首屏同步
      delay: -deterministicRandom(i * 2 + 5) * options.maxDuration,
      dx: options.maxDrift * (deterministicRandom(i * 2 + 6) * 2 - 1),
      dy: options.maxDrift * (deterministicRandom(i * 2 + 7) * 2 - 1),
    });
  }
  return specs;
}

const driftParticles = buildParticles(28, {
  minSize: 2,
  maxSize: 4,
  minDuration: 9,
  maxDuration: 21,
  maxDrift: 56,
});

const flowParticles = buildParticles(12, {
  minSize: 2,
  maxSize: 3,
  minDuration: 2.4,
  maxDuration: 4.6,
  maxDrift: 96,
});

function particleStyle(spec: ParticleSpec, upward = false): CSSProperties {
  return {
    top: `${spec.top}%`,
    left: `${spec.left}%`,
    width: `${spec.size}px`,
    height: `${spec.size}px`,
    // 快速层粒子沿固定方向流动（向上漂移），慢速层在邻域内自由漂浮
    "--particle-dx": `${spec.dx}px`,
    "--particle-dy": `${upward ? -spec.dy : spec.dy}px`,
    "--particle-duration": `${spec.duration}s`,
    "--particle-delay": `${spec.delay}s`,
  } as CSSProperties;
}

function AuthParticles(): ReactNode {
  return (
    <div className="auth-particles" aria-hidden="true">
      {driftParticles.map((spec, index) => (
        <span key={`drift-${index}`} className="auth-particle" style={particleStyle(spec)} />
      ))}
      {flowParticles.map((spec, index) => (
        <span
          key={`flow-${index}`}
          className="auth-particle auth-particle--flow"
          style={particleStyle(spec, true)}
        />
      ))}
    </div>
  );
}

function AuthBrand(): ReactNode {
  return (
    <div className="auth-brand">
      <span>
        <strong>{loginText(GENERATED_BRANDING.systemTitle, "logoName", "systemTitle")}</strong>
        <small>{loginText(GENERATED_BRANDING.headerTitle, "subTitle", "nextTitle")}</small>
      </span>
    </div>
  );
}

export function AuthShell({
  children,
  state,
}: {
  children: ReactNode;
  state: AuthState;
}): ReactNode {
  return (
    <div className="auth-page" data-auth-state={state}>
      <div className="auth-scene" aria-hidden="true">
        <AuthParticles />
      </div>

      <header className="auth-page-header">
        <AuthBrand />
      </header>

      <main className="auth-centered-stage">
        <aside className="auth-showcase" aria-label="管理后台简介">
          <div className="auth-showcase__eyebrow">ADMIN CONSOLE</div>
          <h1>摄影约拍与档期<br />统一管理后台</h1>
          <p>集中管理摄影师入驻、档期、预约订单与作品内容，让运营协作更高效。</p>
          <div className="auth-showcase__features">
            <span><strong>01</strong><b>摄影师入驻审核</b><small>统一查看资料与服务信息</small></span>
            <span><strong>02</strong><b>档期与预约管理</b><small>清晰掌握订单执行进度</small></span>
            <span><strong>03</strong><b>内容与数据概览</b><small>快速了解平台经营状态</small></span>
          </div>
        </aside>
        <section className="auth-card">
          <div className="auth-tenant-line" aria-label="后台管理">
            <span>{loginText("管理员登录", "tag", "loginTag")}</span>
            <strong>管理后台</strong>
          </div>

          <div className="auth-action-content">{children}</div>
        </section>
      </main>

      <footer className="auth-page-footer">{loginText(GENERATED_BRANDING.systemTitle, "footText", "footer")}</footer>
    </div>
  );
}

function InlineError({ children }: { children: string }): ReactNode {
  return (
    <div className="auth-inline-error" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function PasswordChangeView({
  onChanged,
  tenantSlug,
}: {
  onChanged: () => void;
  tenantSlug: string;
}): ReactNode {
  const [form] = Form.useForm();
  const [error, setError] = useState<string>();
  const [state, setState] = useState<AuthState>("secure");

  function reportError(message: string): void {
    setError(message);
    setState("error");
  }

  async function submit(): Promise<void> {
    try {
      setError(undefined);
      const values = await form.validateFields();
      if (values.newPassword !== values.confirmation) {
        reportError("两次输入的个人密码不一致，请重新确认。");
        form.focusField("confirmation");
        return;
      }
      setState("pending");
      const result = await runPasswordChangeWorkflow(
        {
          confirmation: values.confirmation,
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        authClient,
      );
      if (result.kind !== "changed") {
        reportError(result.message);
        if (result.kind === "invalid-input" && result.field === "confirmation") {
          form.focusField("confirmation");
        }
        return;
      }
      setState("success");
      window.setTimeout(onChanged, 240);
    } catch (caught) {
      if (caught && typeof caught === "object" && "errorFields" in caught) {
        setState("secure");
      } else {
        reportError("密码修改暂时不可用，请稍后重试。");
      }
    }
  }

  const pending = state === "pending" || state === "success";

  return (
    <AuthShell state={state}>
      <header className="auth-action-header">
        <span className="auth-state-icon auth-state-icon--secure" aria-hidden="true">
          <KeyRound size={21} />
        </span>
        <h1>设置个人密码</h1>
        <p>当前账号正在使用初始密码，请设置一个至少 12 位的新密码。</p>
      </header>

      {error ? <InlineError>{error}</InlineError> : null}

      <Form form={form} layout="vertical" className="auth-form" onFinish={() => void submit()}>
        <Form.Item
          name="currentPassword"
          label="当前初始密码"
          rules={[{ required: true, message: "请输入当前密码" }]}
        >
          <Input.Password autoComplete="current-password" size="large" disabled={pending} />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新个人密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 12, message: "密码至少 12 位" },
          ]}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" size="large" disabled={pending} />
        </Form.Item>
        <Form.Item
          name="confirmation"
          label="再次输入新密码"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("两次输入的密码不一致"));
              },
            }),
          ]}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" size="large" disabled={pending} />
        </Form.Item>
        <Form.Item className="auth-submit-field">
          <Button type="primary" size="large" block htmlType="submit" loading={pending}>
            {state === "success" ? (
              <>
                <Check size={17} aria-hidden="true" />
                已设置，正在返回登录
              </>
            ) : state === "pending" ? (
              "正在更新密码"
            ) : (
              "设置并重新登录"
            )}
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
}

const rememberedUsernameKey = "admin-remember-username";

export function LoginView({
  onAuthenticated,
}: {
  tenantSlug?: string | undefined;
  onAuthenticated: (tenantSlug: string, session: ClientSession) => void;
}): ReactNode {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | undefined>(() => portal.sessionExpiredNotice());
  const [state, setState] = useState<AuthState>("idle");
  const [captchaKey, setCaptchaKey] = useState(() => String(Date.now()));
  const [captchaUrl, setCaptchaUrl] = useState<string>();
  const [captchaLoading, setCaptchaLoading] = useState(true);

  useEffect(() => {
    const remembered = window.localStorage.getItem(rememberedUsernameKey);
    if (remembered) form.setFieldValue("loginName", remembered);
  }, [form]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;
    setCaptchaLoading(true);
    setCaptchaUrl(undefined);
    void fetchCaptchaBlob(captchaKey)
      .then((blob) => {
        const nextUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        objectUrl = nextUrl;
        setCaptchaUrl(nextUrl);
      })
      .catch(() => {
        if (!cancelled) setCaptchaUrl(undefined);
      })
      .finally(() => {
        if (!cancelled) setCaptchaLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [captchaKey]);

  function refreshCaptcha(): void {
    form.setFieldValue("captcha", "");
    setCaptchaKey(String(Date.now()));
  }

  function reportError(message: string, focusPassword = false): void {
    setError(message);
    setState("error");
    refreshCaptcha();
    if (focusPassword) {
      form.setFieldValue("password", "");
      window.requestAnimationFrame(() => form.focusField("password"));
    }
  }

  async function submit(): Promise<void> {
    try {
      setError(undefined);
      const values = await form.validateFields();
      setState("pending");
      const result = await runLoginWorkflow(
        {
          loginName: values.loginName,
          password: values.password,
          captcha: values.captcha,
          captchaKey,
        },
        {
          client: authClient,
          portal: "admin",
        },
      );
      if (result.kind !== "authenticated") {
        reportError(
          result.message,
          result.kind === "error" ||
            result.kind === "access-denied" ||
            (result.kind === "invalid-input" && result.field === "password"),
        );
        return;
      }
      window.localStorage.setItem(rememberedUsernameKey, String(values.loginName).trim());
      setState("success");
      window.setTimeout(() => onAuthenticated(result.tenantSlug, result.session), 240);
    } catch (caught) {
      if (caught && typeof caught === "object" && "errorFields" in caught) {
        setState("idle");
      } else {
        reportError("登录服务暂时不可用，请稍后重试。", true);
      }
    }
  }

  const pending = state === "pending" || state === "success";

  return (
    <AuthShell state={state}>
      <header className="auth-action-header">
        <h1>{loginText("管理员登录", "formTitle", "welcomeTitle")}</h1>
      </header>

      {error ? <InlineError>{error}</InlineError> : null}

      <Form form={form} layout="vertical" className="auth-form" onFinish={() => void submit()}>
        <Form.Item
          name="loginName"
          label="用户名"
          rules={[{ required: true, message: "请输入用户名" }]}
        >
          <Input
            aria-label="用户名"
            autoComplete="username"
            size="large"
            placeholder="请输入用户名"
            prefix={<UserRound size={17} aria-hidden="true" />}
            disabled={pending}
          />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          className="auth-password-field"
          rules={[
            { required: true, message: "请输入密码" },
            { min: 6, message: "密码长度不能少于6位" },
          ]}
        >
          <Input.Password
            aria-label="密码"
            autoComplete="current-password"
            size="large"
            placeholder="请输入密码"
            prefix={<LockKeyhole size={17} aria-hidden="true" />}
            disabled={pending}
          />
        </Form.Item>
        <Form.Item label="验证码">
          <div className="auth-captcha-row">
            <Form.Item
              name="captcha"
              noStyle
              rules={[{ required: true, message: "请输入验证码" }]}
            >
              <Input
                aria-label="验证码"
                size="large"
                placeholder="请输入验证码"
                disabled={pending}
              />
            </Form.Item>
            <button
              type="button"
              className="auth-captcha-image"
              onClick={refreshCaptcha}
              disabled={pending}
              aria-label="刷新验证码"
            >
              {captchaUrl ? (
                <img src={captchaUrl} alt="验证码" />
              ) : (
                <span>{captchaLoading ? "加载中" : "点击获取"}</span>
              )}
            </button>
          </div>
        </Form.Item>
        <p className="auth-recovery-note">忘记密码？请联系管理员。</p>
        <Form.Item className="auth-submit-field">
          <Button type="primary" size="large" block htmlType="submit" loading={pending}>
            {state === "success" ? (
              <>
                <Check size={17} aria-hidden="true" />
                验证成功，正在进入
              </>
            ) : state === "pending" ? (
              "正在验证身份"
            ) : (
              "登录"
            )}
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
}
