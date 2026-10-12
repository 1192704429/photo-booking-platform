import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { loginUser } from "../../api";
import "./auth.css";

const { Title, Paragraph, Text } = Typography;

/** 登录页：普通用户与摄影师共用；摄影师默认进入数据概览 */
export function LoginPage(): ReactNode {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectParam = useMemo(() => params.get("redirect"), [params]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { username: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      const session = await loginUser(values.username.trim(), values.password);
      const fallback = session.roleType === "photographer" ? "/overview" : "/photographers";
      void navigate(redirectParam || fallback, { replace: true });
    } catch (err) {
      setError((err as Error).message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell auth-shell">
      <main className="auth-page auth-page--login">
        <Link to="/" className="auth-back"><ArrowLeftOutlined />返回首页</Link>
        <div className="auth-layout">
          <aside className="auth-visual" aria-hidden="true">
            <div className="auth-visual-copy">
              <span>MAKE A MEMORY</span>
              <h1>让每一次相遇，<br />成为值得珍藏的画面。</h1>
              <p>浏览作品，遇见契合的摄影师，轻松完成一次约拍。</p>
            </div>
          </aside>
          <Card className="auth-card" variant="borderless">
            <Text className="auth-kicker">WELCOME BACK</Text>
            <Title level={2} className="auth-title">登录约拍</Title>
            <Paragraph type="secondary" className="auth-sub">用你的账号继续浏览、收藏和管理预约。</Paragraph>

            <Form layout="vertical" requiredMark={false} onFinish={(v) => void onFinish(v)}>
              <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
                <Input prefix={<UserOutlined />} placeholder="手机号或用户名" autoComplete="username" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="输入登录密码" autoComplete="current-password" />
              </Form.Item>
              {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
              <Button type="primary" htmlType="submit" block loading={loading}>
                {loading ? "登录中…" : <span>登录 <ArrowRightOutlined /></span>}
              </Button>
            </Form>
            <p className="auth-register-note">还没有账号？<Link to="/register">注册用户</Link><span> · </span><Link to="/register?mode=photographer">摄影师入驻</Link></p>
          </Card>
        </div>
      </main>
    </div>
  );
}
