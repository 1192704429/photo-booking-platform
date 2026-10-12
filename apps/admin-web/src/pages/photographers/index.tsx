import type { ClientSession } from "@aicp/auth";
import {
  App as AntApp,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Camera, Check, Eye, RefreshCw, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { generatedRequest } from "../../generated/api";
import { AdminPagination } from "../../shared/admin-pagination";
import { LedgerSection } from "../../shared/ledger-section";
import { OperationsHeader } from "../../shared/operations-header";
import { AdminPageLayout } from "../../shared/shell";

const STYLE_LABELS: Record<number, string> = {
  1: "个人写真",
  2: "情侣写真",
  3: "毕业写真",
  4: "古风写真",
  5: "旅拍",
  6: "婚礼跟拍",
  7: "商业摄影",
  8: "其他",
};

const STYLE_OPTIONS = Object.entries(STYLE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

interface PhotographerWork {
  id: number;
  workTitle?: string;
  coverImage?: string;
  styleType?: number;
  shootLocation?: string;
  workDescription?: string;
  viewCount?: number;
}

interface PhotographerPackage {
  id: number;
  packageName?: string;
  coverImage?: string;
  packageType?: number;
  price?: number;
  shootDuration?: number;
  retouchedCount?: number;
  originalCount?: number;
  applicablePeople?: number;
  shootLocation?: string;
  packageContent?: string;
}

interface PhotographerRow {
  id: number;
  nickname?: string;
  avatar?: string;
  photographerType?: number;
  serviceCity?: string;
  specialtyStyle?: string;
  workYears?: number;
  personalIntro?: string;
  homepageCover?: string;
  averageScore?: number;
  appointmentCount?: number;
  completedCount?: number;
  accountStatus?: number;
  photographerAuditStatus?: number;
  auditRemark?: string;
  createTime?: string;
  works?: PhotographerWork[];
  packages?: PhotographerPackage[];
}

interface PageResult {
  records?: PhotographerRow[];
  total?: number;
}

function formatSpecialty(raw?: string): string {
  if (!raw) return "—";
  return raw
    .split(/[,，、/|]+/)
    .map((part) => {
      const token = part.trim();
      const asNum = Number(token);
      if (Number.isFinite(asNum) && STYLE_LABELS[asNum]) return STYLE_LABELS[asNum];
      return token;
    })
    .filter(Boolean)
    .join(" · ") || "—";
}

function photographerTypeLabel(type?: number): string {
  if (type === 1) return "个人";
  if (type === 2) return "工作室";
  return "—";
}

export function PhotographersPage({
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
  const [rows, setRows] = useState<PhotographerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [auditTab, setAuditTab] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PhotographerRow>();

  const load = useCallback(
    async (nextPage = page, nextSize = pageSize) => {
      setLoading(true);
      try {
        const values = queryForm.getFieldsValue() as {
          nickname?: string;
          serviceCity?: string;
          specialtyStyle?: number;
        };
        const payload: Record<string, unknown> = {};
        if (values.nickname?.trim()) payload.nickname = values.nickname.trim();
        if (values.serviceCity?.trim()) payload.serviceCity = values.serviceCity.trim();
        if (values.specialtyStyle !== undefined && values.specialtyStyle !== null) {
          payload.specialtyStyle = values.specialtyStyle;
        }
        if (auditTab === "pending") {
          payload.photographerAuditStatus = 0;
        }
        const data = await generatedRequest<PageResult>(
          `/admin/photographers/page?current=${nextPage}&size=${nextSize}`,
          "POST",
          payload,
        );
        setRows(data?.records ?? []);
        setTotal(Number(data?.total ?? 0));
        setPage(nextPage);
        setPageSize(nextSize);
      } catch (error) {
        void message.error(error instanceof Error ? error.message : "加载摄影师列表失败");
      } finally {
        setLoading(false);
      }
    },
    [auditTab, message, page, pageSize, queryForm],
  );

  useEffect(() => {
    void load(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditTab]);

  async function openDetail(id: number): Promise<void> {
    setDetailOpen(true);
    setDetail(undefined);
    setDetailLoading(true);
    try {
      const data = await generatedRequest<PhotographerRow>(`/admin/photographers/${id}`);
      setDetail(data);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "加载摄影师详情失败");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function audit(row: PhotographerRow, status: 1 | 2): Promise<void> {
    const action = status === 1 ? "通过" : "驳回";
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: `${action}摄影师入驻申请`,
        content: status === 1 ? `确认通过「${row.nickname || "未命名摄影师"}」的入驻申请吗？` : "确认驳回这条入驻申请吗？",
        okText: action,
        cancelText: "取消",
        okButtonProps: status === 2 ? { danger: true } : undefined,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    try {
      await generatedRequest(`/admin/photographers/${row.id}/audit`, "POST", { status });
      void message.success(`已${action}`);
      await load();
      if (detail?.id === row.id) await openDetail(row.id);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : "审核失败");
    }
  }

  function auditStatusTag(status?: number): ReactNode {
    if (status === 1) return <Tag color="success">已通过</Tag>;
    if (status === 2) return <Tag color="error">已驳回</Tag>;
    return <Tag color="warning">待审核</Tag>;
  }

  const columns: ColumnsType<PhotographerRow> = [
    {
      title: "摄影师",
      key: "profile",
      width: 220,
      render: (_value, row) => (
        <Space>
          <Avatar src={row.avatar} size={40} icon={<Camera size={16} />} />
          <div>
            <div>{row.nickname || "未命名工作室"}</div>
            <div style={{ color: "var(--aicp-color-text-secondary)", fontSize: 12 }}>
              {photographerTypeLabel(row.photographerType)}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "擅长风格",
      dataIndex: "specialtyStyle",
      width: 200,
      ellipsis: true,
      render: (v?: string) => formatSpecialty(v),
    },
    {
      title: "服务城市",
      dataIndex: "serviceCity",
      width: 120,
      render: (v?: string) => v || "—",
    },
    {
      title: "从业年限",
      dataIndex: "workYears",
      width: 100,
      render: (v?: number) => (v == null ? "—" : `${v} 年`),
    },
    {
      title: "综合评分",
      dataIndex: "averageScore",
      width: 100,
      render: (v?: number) => (v == null ? "—" : Number(v).toFixed(1)),
    },
    {
      title: "累计约拍",
      dataIndex: "appointmentCount",
      width: 100,
      render: (v?: number) => v ?? 0,
    },
    {
      title: "审核状态",
      dataIndex: "photographerAuditStatus",
      width: 100,
      render: (v?: number) => auditStatusTag(v),
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_value, row) => (
        <Space size={2}>
          <Button type="link" icon={<Eye size={14} />} onClick={() => void openDetail(row.id)}>查看</Button>
          {row.photographerAuditStatus !== 1 ? (
            <Button type="link" icon={<Check size={14} />} onClick={() => void audit(row, 1)}>通过</Button>
          ) : null}
          {row.photographerAuditStatus !== 2 ? (
            <Button type="link" danger icon={<X size={14} />} onClick={() => void audit(row, 2)}>驳回</Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const works = detail?.works ?? [];
  const packages = detail?.packages ?? [];

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader
        title="摄影师管理"
        description="筛选并查看平台摄影师公开主页、作品与套餐信息。"
        actions={
          <Button icon={<RefreshCw size={14} />} onClick={() => void load()}>
            刷新
          </Button>
        }
      />

      <Tabs
        className="photographer-audit-tabs"
        activeKey={auditTab}
        onChange={(key) => {
          setAuditTab(key as "pending" | "all");
        }}
        items={[
          { key: "pending", label: "待审核入驻" },
          { key: "all", label: "全部摄影师" },
        ]}
      />

      <LedgerSection
        aria-label="摄影师列表"
        toolbar={
          <LedgerSection.Toolbar
            filters={
              <Form form={queryForm} layout="inline" onFinish={() => void load(1, pageSize)}>
                <Form.Item name="nickname">
                  <Input allowClear placeholder="摄影师名称" style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name="serviceCity">
                  <Input allowClear placeholder="服务城市" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="specialtyStyle">
                  <Select
                    allowClear
                    placeholder="擅长风格"
                    style={{ width: 140 }}
                    options={STYLE_OPTIONS}
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
        <Table<PhotographerRow>
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
        title="摄影师公开信息"
        width={720}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ padding: 24, color: "var(--aicp-color-text-secondary)" }}>加载中…</div>
        ) : detail ? (
          <Tabs
            items={[
              {
                key: "profile",
                label: "主页",
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    {detail.homepageCover ? (
                      <Image
                        src={detail.homepageCover}
                        alt="主页封面"
                        style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8 }}
                      />
                    ) : null}
                    <Space>
                      <Avatar src={detail.avatar} size={64} icon={<Camera size={20} />} />
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{detail.nickname || "未命名工作室"}</div>
                        <div style={{ color: "var(--aicp-color-text-secondary)" }}>
                          {formatSpecialty(detail.specialtyStyle)}
                        </div>
                      </div>
                    </Space>
                    <Descriptions column={2} size="small" bordered>
                      <Descriptions.Item label="服务城市">{detail.serviceCity || "—"}</Descriptions.Item>
                      <Descriptions.Item label="从业年限">
                        {detail.workYears == null ? "—" : `${detail.workYears} 年`}
                      </Descriptions.Item>
                      <Descriptions.Item label="综合评分">
                        {detail.averageScore == null ? "—" : Number(detail.averageScore).toFixed(1)}
                      </Descriptions.Item>
                      <Descriptions.Item label="累计约拍">{detail.appointmentCount ?? 0}</Descriptions.Item>
                      <Descriptions.Item label="完成订单">{detail.completedCount ?? 0}</Descriptions.Item>
                      <Descriptions.Item label="主体类型">
                        {photographerTypeLabel(detail.photographerType)}
                      </Descriptions.Item>
                      <Descriptions.Item label="审核状态">
                        {auditStatusTag(detail.photographerAuditStatus)}
                      </Descriptions.Item>
                      <Descriptions.Item label="审核备注" span={2}>
                        {detail.auditRemark || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="个人介绍" span={2}>
                        {detail.personalIntro || "—"}
                      </Descriptions.Item>
                    </Descriptions>
                    <Space>
                      {detail.photographerAuditStatus !== 1 ? (
                        <Button type="primary" icon={<Check size={14} />} onClick={() => void audit(detail, 1)}>通过入驻</Button>
                      ) : null}
                      {detail.photographerAuditStatus !== 2 ? (
                        <Button danger icon={<X size={14} />} onClick={() => void audit(detail, 2)}>驳回申请</Button>
                      ) : null}
                    </Space>
                  </Space>
                ),
              },
              {
                key: "works",
                label: `作品（${works.length}）`,
                children: works.length ? (
                  <Row gutter={[12, 12]}>
                    {works.map((work) => (
                      <Col key={work.id} xs={24} sm={12}>
                        <Card
                          size="small"
                          cover={
                            work.coverImage ? (
                              <Image
                                src={work.coverImage}
                                alt={work.workTitle || "作品"}
                                style={{ height: 140, objectFit: "cover" }}
                              />
                            ) : undefined
                          }
                        >
                          <Card.Meta
                            title={work.workTitle || "未命名作品"}
                            description={
                              <Space wrap size={4}>
                                <Tag>{STYLE_LABELS[work.styleType ?? 0] || "风格未填"}</Tag>
                                <span>{work.shootLocation || "地点未填"}</span>
                              </Space>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无公开作品" />
                ),
              },
              {
                key: "packages",
                label: `套餐（${packages.length}）`,
                children: packages.length ? (
                  <Row gutter={[12, 12]}>
                    {packages.map((pkg) => (
                      <Col key={pkg.id} xs={24} sm={12}>
                        <Card
                          size="small"
                          cover={
                            pkg.coverImage ? (
                              <Image
                                src={pkg.coverImage}
                                alt={pkg.packageName || "套餐"}
                                style={{ height: 140, objectFit: "cover" }}
                              />
                            ) : undefined
                          }
                        >
                          <Card.Meta
                            title={pkg.packageName || "未命名套餐"}
                            description={
                              <Space direction="vertical" size={4}>
                                <Space wrap size={4}>
                                  <Tag>{STYLE_LABELS[pkg.packageType ?? 0] || "类型未填"}</Tag>
                                  <Tag color="blue">
                                    ¥{pkg.price == null ? "—" : Number(pkg.price).toFixed(0)}
                                  </Tag>
                                </Space>
                                <span>
                                  {pkg.shootDuration ? `${pkg.shootDuration} 分钟` : "时长未填"}
                                  {pkg.retouchedCount != null ? ` · 精修 ${pkg.retouchedCount} 张` : ""}
                                </span>
                              </Space>
                            }
                          />
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无公开套餐" />
                ),
              },
            ]}
          />
        ) : (
          <div style={{ padding: 24 }}>暂无数据</div>
        )}
      </Drawer>
    </AdminPageLayout>
  );
}
