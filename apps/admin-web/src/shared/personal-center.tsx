import { encryptPassword } from "@aicp/api-client/template-auth";
import type { ClientSession } from "@aicp/auth";
import { Alert, Button, Descriptions, Form, Input, Modal, Tabs } from "antd";
import { type ReactNode, useState } from "react";

import { modalCloseButtonProps } from "./accessibility";
import { GeneratedPersonalCenterForm } from "../generated/personal-center-form";
import { generatedRequest } from "../generated/api";
import { generatedProjectConfig } from "../generated/project-config";

export function PersonalCenterModal({
  open,
  session,
  tenantSlug,
  onClose,
  onPasswordChanged,
}: {
  open: boolean;
  session: ClientSession;
  tenantSlug: string;
  onClose: () => void;
  onPasswordChanged: () => void;
}): ReactNode {
  const [form] = Form.useForm();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submitPassword(): Promise<void> {
    try {
      const values = await form.validateFields();
      setPending(true);
      setError(undefined);
      const account = session.account as ClientSession["account"] & { id?: string | number };
      if (account.id === undefined) throw new Error("当前登录响应未包含用户编号");
      await generatedRequest(
        `/${generatedProjectConfig.loginTableName}/login/updatePassword`,
        "POST",
        {
          id: account.id,
          oldPassword: await encryptPassword(values.currentPassword),
          newPassword: values.newPassword,
        },
      );
      form.resetFields();
      setPending(false);
      onPasswordChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "密码修改失败");
      setPending(false);
    }
  }

  return (
      <Modal
        title="个人中心"
        open={open}
        onCancel={() => {
          form.resetFields();
          setError(undefined);
          onClose();
        }}
        footer={null}
        destroyOnHidden
        closable={modalCloseButtonProps}
        width={560}
      >
      <Tabs
        items={[
          {
            key: "info",
            label: "个人信息",
            children: generatedProjectConfig.personalCenters.length ? (
              <GeneratedPersonalCenterForm session={session} />
            ) : (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="登录名">{session.account.loginName}</Descriptions.Item>
                <Descriptions.Item label="企业编码">{tenantSlug}</Descriptions.Item>
                <Descriptions.Item label="企业名称">{session.tenant?.organizationName ?? tenantSlug}</Descriptions.Item>
                <Descriptions.Item label="角色">{session.account.roles.join("、")}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: "password",
            label: "修改密码",
            children: (
              <>
                {error ? (
                  <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
                ) : null}
                <Form form={form} layout="vertical" onFinish={() => void submitPassword()}>
                  <Form.Item
                    name="currentPassword"
                    label="原密码"
                    rules={[{ required: true, message: "请输入原密码" }]}
                  >
                    <Input.Password autoComplete="current-password" disabled={pending} />
                  </Form.Item>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: "请输入新密码" },
                      { min: 12, message: "密码至少 12 位" },
                    ]}
                  >
                    <Input.Password autoComplete="new-password" disabled={pending} />
                  </Form.Item>
                  <Form.Item
                    name="confirmation"
                    label="确认密码"
                    dependencies={["newPassword"]}
                    rules={[
                      { required: true, message: "请确认密码" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("newPassword") === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error("两次输入的密码不一致"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" disabled={pending} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={pending}>
                      修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
}
