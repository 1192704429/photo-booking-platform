import type { ClientSession } from "@aicp/auth";
import { Alert, App as AntApp, Button, Form } from "antd";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { generatedRequest } from "./api";
import { GeneratedProfileControl } from "./components/field-renderer";
import { generatedProjectConfig } from "./project-config";

type Profile = Record<string, unknown>;

export function GeneratedPersonalCenterForm({ session }: { session: ClientSession }): ReactNode {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const account = session.account as ClientSession["account"] & { id?: string | number };
  const role = session.account.roles[0];
  const config = useMemo(
    () => generatedProjectConfig.personalCenters.find((item) => String(item.key) === String(role))
      ?? generatedProjectConfig.personalCenters[0],
    [role],
  );

  useEffect(() => {
    if (!config || account.id === undefined) return;
    setLoading(true);
    void generatedRequest<Profile>(
      `/${generatedProjectConfig.loginTableName}/login/getUserInfoById?id=${encodeURIComponent(account.id)}`,
    ).then((profile) => form.setFieldsValue(profile ?? {}))
      .catch((error) => void message.error(error instanceof Error ? error.message : "个人信息加载失败"))
      .finally(() => setLoading(false));
  }, [account.id, config, form, message]);

  if (!config) {
    return <Alert type="info" showIcon message="当前项目尚未配置个人中心字段" />;
  }
  if (account.id === undefined) {
    return <Alert type="warning" showIcon message="当前登录响应未包含用户编号，无法编辑个人信息" />;
  }

  async function save(): Promise<void> {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await generatedRequest(
        `/${generatedProjectConfig.loginTableName}/login/updateUserInfo`,
        "POST",
        { id: account.id, ...values },
      );
      void message.success("个人信息已保存");
    } catch (error) {
      if (!(error && typeof error === "object" && "errorFields" in error)) {
        void message.error(error instanceof Error ? error.message : "个人信息保存失败");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form form={form} layout="vertical" disabled={loading} onFinish={() => void save()}>
      {config.fields.map((field) => {
        return (
          <Form.Item key={field.fieldName} name={field.fieldName} label={field.fieldLabel}>
            <GeneratedProfileControl
              component={field.component === "textArea" ? "textarea" : field.component}
              options={field.options}
              disabled={field.disabled}
            />
          </Form.Item>
        );
      })}
      <Button type="primary" htmlType="submit" loading={loading}>保存修改</Button>
    </Form>
  );
}
