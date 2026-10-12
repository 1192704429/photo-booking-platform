import type { ClientSession } from "@aicp/auth";
import {
  App as AntApp,
  Avatar,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Eye, RefreshCw, Search } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { generatedRequest } from "../../generated/api";
import { AdminPagination } from "../../shared/admin-pagination";
import { LedgerSection } from "../../shared/ledger-section";
import { OperationsHeader } from "../../shared/operations-header";
import { AdminPageLayout } from "../../shared/shell";

interface AdminUserRow {
  id: number;
  username?: string;
  nickname?: string;
  avatar?: string;
  gender?: number;
  phone?: string;
  email?: string;
  city?: string;
  accountStatus?: number;
  favoriteStyle?: string;
  lastLoginTime?: string;
  createTime?: string;
}

interface PageResult {
  records?: AdminUserRow[];
  total?: number;
}

function genderLabel(gender?: number): string {
  if (gender === 1) return "男";
  if (gender === 2) return "女";
  return "未填写";
}

function statusTag(status?: number): ReactNode {
  if (status === 0) return <Tag color="default">停用</Tag>;
  if (status === 1) return <Tag color="success">正常</Tag>;
  return <Tag>未知</Tag>;
}

export function UsersPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const { message } = AntApp.useApp();
  const [queryForm] = Form.useForm();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<AdminUserRow>();

  const load = useCallback(
    async (nextPage = page, nextSize = pageSize) => {
      setLoading(true);
      try {
        const values = queryForm.getFieldsValue() as {
          keyword?: string;
          phone?: string;
          accountStatus?: number;
          gender?: number;
        };
        const payload: Record<string, unknown> = {};
        if (values.keyword?.trim()) payload.keyword = values.keyword.trim();
        if (values.phone?.trim()) payload.phone = values.phone.trim();
        if (values.accountStatus !== undefined && values.accountStatus !== null) {
          payload.accountStatus = values.accountStatus;
        }
        if (values.gender !== undefined && values.gender !== null) {
          payload.gender = values.gender;
        }
        const data = await generatedRequest<PageResult>(
          `/admin/users/page?current=${nextPage}&size=${nextSize}`,
          "POST",
          payload,
        );
        setRows(data?.records ?? []);
        setTotal(Number(data?.total ?? 0));
        setPage(nextPage);
        setPageSize(nextSize);
      } catch (error) {
        void message.error(error instanceof Error ? error.message : "加载用户列表失败");
      } finally {
        setLoading(false);
      }
    },
    [message, page, pageSize, queryForm],
  );

  useEffect(() => {
    void load(1, pageSize);
    // 初次进入拉取第一页
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(id: number): Promise<void> {
    setDetailOpen(true);
    setDetail(undefined);
    setDetailLoading(true);
    try {
      const data = await generatedRequest<AdminUserRow>(`/admin/users/${id}`);
      setDetail(data);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "加载用户详情失败");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  const columns: ColumnsType<AdminUserRow> = [
    {
      title: "用户",
      key: "user",
      width: 220,
      render: (_value, row) => (
        <Space>
          <Avatar src={row.avatar} size={36}>
            {(row.nickname || row.username || "?").slice(0, 1)}
          </Avatar>
          <div>
            <div>{row.nickname || "未设置昵称"}</div>
            <div style={{ color: "var(--aicp-color-text-secondary)", fontSize: 12 }}>{row.username}</div>
          </div>
        </Space>
      ),
    },
    { title: "手机号", dataIndex: "phone", width: 130, render: (v?: string) => v || "—" },
    { title: "城市", dataIndex: "city", width: 100, render: (v?: string) => v || "—" },
    {
      title: "性别",
      dataIndex: "gender",
      width: 72,
      render: (v?: number) => genderLabel(v),
    },
    {
      title: "状态",
      dataIndex: "accountStatus",
      width: 88,
      render: (v?: number) => statusTag(v),
    },
    {
      title: "注册时间",
      dataIndex: "createTime",
      width: 170,
      render: (v?: string) => v || "—",
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_value, row) => (
        <Button type="link" icon={<Eye size={14} />} onClick={() => void openDetail(row.id)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader
        title="用户管理"
        description="管理平台普通用户资料，支持关键词检索与查看详情；不展示摄影师等无关业务数据。"
        actions={
          <Button icon={<RefreshCw size={14} />} onClick={() => void load()}>
            刷新
          </Button>
        }
      />

      <LedgerSection
        aria-label="用户列表"
        toolbar={
          <LedgerSection.Toolbar
            filters={
              <Form form={queryForm} layout="inline" onFinish={() => void load(1, pageSize)}>
                <Form.Item name="keyword">
                  <Input
                    allowClear
                    placeholder="关键词：账号/昵称/手机/邮箱/城市"
                    style={{ width: 240 }}
                    prefix={<Search size={14} />}
                  />
                </Form.Item>
                <Form.Item name="phone">
                  <Input allowClear placeholder="手机号" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="gender">
                  <Select
                    allowClear
                    placeholder="性别"
                    style={{ width: 110 }}
                    options={[
                      { value: 1, label: "男" },
                      { value: 2, label: "女" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="accountStatus">
                  <Select
                    allowClear
                    placeholder="账号状态"
                    style={{ width: 120 }}
                    options={[
                      { value: 1, label: "正常" },
                      { value: 0, label: "停用" },
                    ]}
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        queryForm.resetFields();
                        void load(1, pageSize);
                      }}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            }
          />
        }
        footer={
          <AdminPagination
            total={total}
            current={page}
            pageSize={pageSize}
            hideOnSinglePage={false}
            onChange={(current, size) => void load(current, size)}
          />
        }
      >
        <Table<AdminUserRow>
          size="small"
          rowKey={(row) => String(row.id)}
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: "max-content" }}
          pagination={false}
        />
      </LedgerSection>

      <Drawer
        title="用户信息"
        width={480}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ padding: 24, color: "var(--aicp-color-text-secondary)" }}>加载中…</div>
        ) : detail ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="头像">
              <Avatar src={detail.avatar} size={56}>
                {(detail.nickname || detail.username || "?").slice(0, 1)}
              </Avatar>
            </Descriptions.Item>
            <Descriptions.Item label="登录账号">{detail.username || "—"}</Descriptions.Item>
            <Descriptions.Item label="昵称">{detail.nickname || "—"}</Descriptions.Item>
            <Descriptions.Item label="手机号">{detail.phone || "—"}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detail.email || "—"}</Descriptions.Item>
            <Descriptions.Item label="城市">{detail.city || "—"}</Descriptions.Item>
            <Descriptions.Item label="性别">{genderLabel(detail.gender)}</Descriptions.Item>
            <Descriptions.Item label="账号状态">{statusTag(detail.accountStatus)}</Descriptions.Item>
            <Descriptions.Item label="偏好风格">{detail.favoriteStyle || "—"}</Descriptions.Item>
            <Descriptions.Item label="最后登录">{detail.lastLoginTime || "—"}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{detail.createTime || "—"}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ padding: 24 }}>暂无数据</div>
        )}
      </Drawer>
    </AdminPageLayout>
  );
}
