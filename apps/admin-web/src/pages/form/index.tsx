import type { ClientSession } from "@aicp/auth";
import { App as AntApp, Button, Checkbox, DatePicker, Form, Input, Radio, Select, Space, Switch, TimePicker } from "antd";
import type { ReactNode } from "react";

import { OperationsHeader } from "../../shared/operations-header";
import { LedgerSection } from "../../shared/ledger-section";
import { AdminPageLayout } from "../../shared/shell";

export function FormPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader title="表单" description="对应原模板 Form 页，字段与交互保持一致。" />
      <LedgerSection aria-label="活动表单">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 12 }}
          style={{ padding: 24 }}
          initialValues={{ delivery: false, type: [] }}
          onFinish={() => {
            void message.success("submit!");
          }}
        >
          <Form.Item name="name" label="Activity name">
            <Input />
          </Form.Item>
          <Form.Item name="region" label="Activity zone">
            <Select
              placeholder="please select your zone"
              options={[
                { label: "Zone one", value: "shanghai" },
                { label: "Zone two", value: "beijing" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Activity time">
            <Space>
              <Form.Item name="date1" noStyle>
                <DatePicker />
              </Form.Item>
              <span>-</span>
              <Form.Item name="date2" noStyle>
                <TimePicker />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="delivery" label="Instant delivery" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="type" label="Activity type">
            <Checkbox.Group
              options={[
                "Online activities",
                "Promotion activities",
                "Offline activities",
                "Simple brand exposure",
              ]}
            />
          </Form.Item>
          <Form.Item name="resource" label="Resources">
            <Radio.Group
              options={[
                { label: "Sponsor", value: "Sponsor" },
                { label: "Venue", value: "Venue" },
              ]}
            />
          </Form.Item>
          <Form.Item name="desc" label="Activity form">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 4 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                Create
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  void message.warning("cancel!");
                }}
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </LedgerSection>
    </AdminPageLayout>
  );
}
