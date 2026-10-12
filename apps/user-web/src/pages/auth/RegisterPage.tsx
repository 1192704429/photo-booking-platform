import { Alert, Button, Card, Form, Input, InputNumber, Radio, Segmented, Typography } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { applyPhotographer, registerUser, type RegisterPayload } from "../../api";
import "./auth.css";

const { Title, Text } = Typography;

export function RegisterPage(): ReactNode {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"user" | "photographer">(
    params.get("mode") === "photographer" ? "photographer" : "user",
  );
  const [form] = Form.useForm<RegisterPayload>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function changeMode(value: string | number) {
    setMode(value as "user" | "photographer");
    setError(null);
    setSuccess(null);
    form.resetFields(["serviceCity", "specialtyStyle", "workYears", "personalIntro"]);
  }

  async function onFinish(values: RegisterPayload) {
    setLoading(true);
    setError(null);
    try {
      if (mode === "photographer") {
        await applyPhotographer(values);
        setSuccess("入驻申请已提交，审核通过后即可进入摄影师工作台。");
      } else {
        await registerUser(values);
        setSuccess("注册成功，正在返回登录页。");
        window.setTimeout(() => void navigate("/login", { replace: true }), 700);
      }
    } catch (err) {
      setError((err as Error).message || "提交失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell auth-shell">
      <main className="auth-page auth-page--register">
        <Link to="/login" className="auth-back"><ArrowLeftOutlined />返回登录</Link>
        <div className="auth-layout auth-layout--register">
          <aside className="auth-visual" aria-hidden="true">
            <div className="auth-visual-copy">
              <span>JOIN THE MOMENT</span>
              <h1>记录光影，<br />也成为创造光影的人。</h1>
              <p>加入约拍，发现喜欢的摄影师，或开启你的摄影师工作室。</p>
            </div>
          </aside>
          <Card className="auth-card" variant="borderless">
            <Text className="auth-kicker">CREATE ACCOUNT</Text>
            <Title level={2} className="auth-title">加入约拍</Title>
            <Segmented
              block
              value={mode}
              onChange={changeMode}
              options={[{ label: "用户注册", value: "user" }, { label: "摄影师入驻", value: "photographer" }]}
              className="auth-mode-switch"
            />
            <p className="auth-mode-hint">
              {mode === "photographer"
                ? "提交资料后等待平台审核，审核通过即可发布作品和套餐。"
                : "创建账号后即可浏览作品、收藏摄影师并管理预约。"}
            </p>
            {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
            {success ? <Alert type="success" showIcon message={success} style={{ marginBottom: 16 }} /> : null}
            <Form form={form} layout="vertical" requiredMark={false} onFinish={(v) => void onFinish(v)}>
              <div className="auth-form-grid">
                <Form.Item label="账号" name="username" rules={[{ required: true, min: 3, message: "请输入至少 3 位账号" }]}>
                  <Input placeholder="设置登录账号" autoComplete="username" />
                </Form.Item>
                <Form.Item label="密码" name="password" rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}>
                  <Input.Password placeholder="设置登录密码" autoComplete="new-password" />
                </Form.Item>
                <Form.Item label={mode === "photographer" ? "工作室名称 / 昵称" : "昵称"} name="nickname" rules={[{ required: true, message: "请输入昵称或工作室名称" }]}>
                  <Input placeholder={mode === "photographer" ? "例如：光影工作室" : "怎么称呼你"} />
                </Form.Item>
                <Form.Item label="手机号" name="phone"><Input placeholder="选填" /></Form.Item>
              </div>
              {mode === "photographer" ? <>
                <div className="auth-form-grid auth-form-grid--three">
                  <Form.Item label="服务城市" name="serviceCity" rules={[{ required: true, message: "请输入服务城市" }]}><Input placeholder="例如：杭州" /></Form.Item>
                  <Form.Item label="从业年限" name="workYears"><InputNumber min={0} max={80} style={{ width: "100%" }} placeholder="选填" /></Form.Item>
                  <Form.Item label="主体类型" name="photographerType" initialValue={1}>
                    <Radio.Group options={[{ label: "个人摄影师", value: 1 }, { label: "摄影工作室", value: 2 }]} />
                  </Form.Item>
                </div>
                <div className="auth-form-grid">
                  <Form.Item label="擅长风格" name="specialtyStyle" rules={[{ required: true, message: "请输入擅长风格" }]}><Input placeholder="例如：日系、纪实、人像" /></Form.Item>
                  <Form.Item label="个人 / 工作室介绍" name="personalIntro" rules={[{ required: true, message: "请填写介绍" }]}><Input.TextArea rows={1} maxLength={300} placeholder="简要介绍拍摄风格和服务特色" /></Form.Item>
                </div>
              </> : <Form.Item label="所在城市" name="city"><Input placeholder="选填" /></Form.Item>}
              <Button type="primary" htmlType="submit" block loading={loading}>
                {loading ? "提交中…" : <span>{mode === "photographer" ? "提交入驻申请" : "创建账号"} <ArrowRightOutlined /></span>}
              </Button>
            </Form>
          </Card>
        </div>
      </main>
    </div>
  );
}
