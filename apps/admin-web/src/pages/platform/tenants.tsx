import {
  createPlatformTenant,
  listPlatformTenants,
  type PlatformTenant,
} from "@aicp/api-client/admin";
import { ApiError } from "@aicp/api-client/common";
import type { ClientSession } from "@aicp/auth";
import {
  App as AntApp,
  Button,
  Drawer,
  Flex,
  Form,
  Input,
  Table,
  Tag,
} from "antd";
import { Plus, RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { LedgerEmpty } from "../../shared/ledger-empty";
import { LedgerIdentity } from "../../shared/ledger-identity";
import { LedgerSection } from "../../shared/ledger-section";
import { OperationsHeader } from "../../shared/operations-header";
import { PlatformPageLayout } from "../../shared/shell";
import { StatsStrip } from "../../shared/stats-strip";

interface TenantFormValues {
  organizationName: string;
  slug: string;
  loginName: string;
  password: string;
}

export function PlatformTenantsPage({
  session,
  onLogout,
}: {
  session: ClientSession;
  onLogout: () => void;
}): ReactNode {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<TenantFormValues>();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    setLoadError(undefined);
    try {
      setTenants(await listPlatformTenants());
    } catch (caught) {
      const errorMessage = caught instanceof ApiError ? caught.message : "租户列表加载失败";
      setLoadError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(): Promise<void> {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const result = await createPlatformTenant({
        organizationName: values.organizationName.trim(),
        slug: values.slug.trim().toLowerCase(),
        initialAdministrator: {
          loginName: values.loginName.trim(),
          password: values.password,
        },
      });
      setOpen(false);
      form.resetFields();
      message.success(`租户已创建，登录地址：${result.loginPath}`);
      await load();
    } catch (caught) {
      if (caught instanceof ApiError) message.error(caught.message);
    } finally {
      setSaving(false);
    }
  }

  const overlay = (
    <Drawer
      title="创建租户"
      open={open}
      width={480}
      onClose={() => setOpen(false)}
      footer={
        <Flex justify="end" gap={8}>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button type="primary" loading={saving} onClick={() => void create()}>创建</Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="organizationName" label="企业名称" rules={[{ required: true, whitespace: true }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="slug" label="企业编码" extra="小写字母、数字或连字符，用于登录地址" rules={[{ required: true, pattern: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/ }]}>
          <Input maxLength={63} placeholder="例如：acme" />
        </Form.Item>
        <Form.Item name="loginName" label="初始管理员登录名" rules={[{ required: true, whitespace: true }]}>
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 12, message: "密码至少 12 位" }]}>
          <Input.Password maxLength={200} autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Drawer>
  );

  return (
    <PlatformPageLayout session={session} onLogout={onLogout} overlay={overlay}>
      <OperationsHeader
        title="租户管理"
        description="查看平台中的全部企业租户，并创建企业及其初始管理员。"
        actions={
          <Flex gap={8}>
            <Button icon={<RefreshCw size={15} />} loading={loading} onClick={() => void load()}>刷新</Button>
            <Button type="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>创建租户</Button>
          </Flex>
        }
      />
      <StatsStrip aria-label="租户统计">
        <StatsStrip.Item label="租户总数" value={tenants.length} unit="家企业" />
        <StatsStrip.Item label="正常租户" value={tenants.filter((tenant) => tenant.status === "active").length} unit="正常运行" />
        <StatsStrip.Item label="停用租户" value={tenants.filter((tenant) => tenant.status === "suspended").length} unit="已停用" />
      </StatsStrip>
      <LedgerSection aria-label="租户列表">
          <Table<PlatformTenant>
            rowKey="id"
            loading={loading}
            dataSource={tenants}
            pagination={false}
            locale={{
              emptyText: (
                <LedgerEmpty emptyText={loadError ? `加载失败：${loadError}` : "还没有企业租户"} />
              ),
            }}
            columns={[
              {
                title: "企业租户",
                render: (_, tenant) => (
                  <LedgerIdentity title={tenant.organizationName} subtitle={tenant.slug} />
                ),
              },
              { title: "企业编码", dataIndex: "slug", width: 180 },
              { title: "初始管理员", dataIndex: "initialAdministrator", width: 180 },
              { title: "创建时间", dataIndex: "createdAt", width: 190, render: formatDateTime },
              {
                title: "状态",
                dataIndex: "status",
                width: 100,
                render: (status: PlatformTenant["status"]) => (
                  <Tag color={status === "active" ? "success" : "default"}>
                    {status === "active" ? "正常" : "已停用"}
                  </Tag>
                ),
              },
              {
                title: "登录地址",
                width: 220,
                render: (_, tenant) => <a href={`/${tenant.slug}/admin/login`}>{`/${tenant.slug}/admin/login`}</a>,
              },
            ]}
          />
      </LedgerSection>
    </PlatformPageLayout>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}
