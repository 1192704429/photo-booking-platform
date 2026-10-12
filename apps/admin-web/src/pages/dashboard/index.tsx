import type { ClientSession } from "@aicp/auth";
import { Alert, Col, Empty, Row, Spin } from "antd";
import {
  CalendarCheck2,
  Camera,
  ChevronRight,
  ClipboardList,
  Images,
  Package,
  ShieldAlert,
  ShoppingBag,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { generatedRequest } from "../../generated/api";
import { OperationsHeader } from "../../shared/operations-header";
import { LedgerSection } from "../../shared/ledger-section";
import { AdminPageLayout } from "../../shared/shell";
import { StatsStrip } from "../../shared/stats-strip";
import { ChartCard } from "../charts/chart-card";
import "./dashboard.css";

interface ChartDatum {
  name: string;
  value: number | string;
}

interface AdminPlatformStats {
  photographerCount?: number;
  userCount?: number;
  appointmentCount?: number;
  completedOrderCount?: number;
  pendingPhotographerCount?: number;
  packageCount?: number;
  workCount?: number;
  pendingComplaintCount?: number;
  popularShootTypes?: ChartDatum[];
  monthlyAppointmentTrend?: ChartDatum[];
  orderStatusDistribution?: ChartDatum[];
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function DashboardPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [stats, setStats] = useState<AdminPlatformStats>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void generatedRequest<AdminPlatformStats>("/admin/stats/overview")
      .then((data) => {
        if (!cancelled) setStats(data ?? {});
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载数据统计失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const popularTypes = useMemo(
    () => (stats?.popularShootTypes ?? []).map((item) => ({ name: item.name, value: toNumber(item.value) })),
    [stats],
  );

  const monthlyTrend = useMemo(
    () =>
      (stats?.monthlyAppointmentTrend ?? []).map((item) => ({
        name: item.name,
        value: toNumber(item.value),
      })),
    [stats],
  );

  const orderStatusDistribution = useMemo(
    () => (stats?.orderStatusDistribution ?? []).map((item) => ({ name: item.name, value: toNumber(item.value) })),
    [stats],
  );

  const roles = session.account.roles;
  const canOperate = roles.some((role) => ["enterprise-administrator", "training-operator", "azhou", "admin"].includes(role));
  const canManageContent = roles.some((role) => ["enterprise-administrator", "editor", "azhou", "admin"].includes(role));
  const quickActions = [
    canOperate ? { to: "/admin/photographers", title: "审核摄影师入驻", description: "查看摄影师资料与入驻审核状态", icon: Camera } : null,
    canOperate ? { to: "/admin/orders", title: "跟进约拍订单", description: "管理订单状态与履约进度", icon: ShoppingBag } : null,
    canManageContent ? { to: "/admin/works", title: "管理摄影作品", description: "维护首页展示内容与作品信息", icon: Images } : null,
    canOperate ? { to: "/admin/complaints", title: "处理举报投诉", description: "跟踪平台纠纷与处理结果", icon: ShieldAlert } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader
        title="数据统计"
        description="查看平台摄影师、用户、预约与完成订单概况，以及热门拍摄类型与月度预约趋势。"
      />

      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

      <Spin spinning={loading}>
        <div style={{ marginBottom: 16 }}>
          <StatsStrip aria-label="平台核心指标">
            <StatsStrip.Item
              label="摄影师数量"
              value={toNumber(stats?.photographerCount)}
              unit="人"
              icon={<Camera size={16} />}
              tone="default"
            />
            <StatsStrip.Item
              label="用户数量"
              value={toNumber(stats?.userCount)}
              unit="人"
              icon={<Users size={16} />}
              tone="default"
            />
            <StatsStrip.Item
              label="预约数量"
              value={toNumber(stats?.appointmentCount)}
              unit="单"
              icon={<ClipboardList size={16} />}
              tone="warning"
            />
            <StatsStrip.Item
              label="完成订单"
              value={toNumber(stats?.completedOrderCount)}
              unit="单"
              icon={<CalendarCheck2 size={16} />}
              tone="success"
            />
            <StatsStrip.Item
              label="套餐 / 作品"
              value={`${toNumber(stats?.packageCount)} / ${toNumber(stats?.workCount)}`}
              icon={<Package size={16} />}
              tone="default"
            />
          </StatsStrip>
        </div>

        {quickActions.length ? (
          <section className="dashboard-quick-section" aria-labelledby="dashboard-quick-title">
            <div className="dashboard-section-heading">
              <div>
                <h2 id="dashboard-quick-title">快捷工作入口</h2>
                <p>根据当前账号角色显示可处理的业务。</p>
              </div>
            </div>
            <div className="dashboard-quick-grid">
              {quickActions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} className="dashboard-quick-card">
                    <span className="dashboard-quick-icon"><Icon size={20} /></span>
                    <span className="dashboard-quick-copy">
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <LedgerSection aria-label="热门拍摄类型">
              <div style={{ padding: "4px 4px 0", fontWeight: 620, fontSize: 14 }}>热门拍摄类型</div>
              {popularTypes.length ? (
                <ChartCard
                  option={{
                    tooltip: { trigger: "item" },
                    legend: { bottom: 0, type: "scroll" },
                    series: [
                      {
                        type: "pie",
                        radius: ["36%", "68%"],
                        center: ["50%", "46%"],
                        data: popularTypes,
                        label: { formatter: "{b}\n{c}" },
                      },
                    ],
                  }}
                />
              ) : (
                <Empty description="暂无拍摄类型数据" style={{ padding: "48px 0" }} />
              )}
            </LedgerSection>
          </Col>
          <Col xs={24} xl={12}>
            <LedgerSection aria-label="月度预约趋势">
              <div style={{ padding: "4px 4px 0", fontWeight: 620, fontSize: 14 }}>月度预约趋势</div>
              {monthlyTrend.length ? (
                <ChartCard
                  option={{
                    tooltip: { trigger: "axis" },
                    grid: { left: 40, right: 20, top: 24, bottom: 36 },
                    xAxis: {
                      type: "category",
                      data: monthlyTrend.map((item) => item.name),
                      axisLabel: { rotate: 0 },
                    },
                    yAxis: { type: "value", minInterval: 1 },
                    series: [
                      {
                        type: "line",
                        smooth: true,
                        areaStyle: { opacity: 0.12 },
                        data: monthlyTrend.map((item) => item.value),
                      },
                    ],
                  }}
                />
              ) : (
                <Empty description="暂无月度预约数据" style={{ padding: "48px 0" }} />
              )}
            </LedgerSection>
          </Col>
          <Col xs={24} xl={12}>
            <LedgerSection aria-label="订单状态分布">
              <div style={{ padding: "4px 4px 0", fontWeight: 620, fontSize: 14 }}>订单状态分布</div>
              {orderStatusDistribution.length ? (
                <ChartCard
                  option={{
                    tooltip: { trigger: "item", formatter: "{b}: {c} 单（{d}%）" },
                    legend: { bottom: 0, type: "scroll" },
                    series: [{ type: "pie", radius: ["38%", "68%"], center: ["50%", "44%"], data: orderStatusDistribution, label: { formatter: "{b} {c}" } }],
                  }}
                />
              ) : <Empty description="暂无订单状态数据" style={{ padding: "48px 0" }} />}
            </LedgerSection>
          </Col>
          <Col xs={24} xl={12}>
            <LedgerSection aria-label="运营待办">
              <div className="dashboard-panel-heading">
                <div><strong>运营待办</strong><small>需要优先关注的事项</small></div>
                <ShieldAlert size={18} />
              </div>
              <div className="dashboard-todo-list">
                <Link to="/admin/photographers" className="dashboard-todo-item"><span>待审核摄影师</span><b>{toNumber(stats?.pendingPhotographerCount)}</b></Link>
                <Link to="/admin/complaints" className="dashboard-todo-item"><span>待处理举报投诉</span><b>{toNumber(stats?.pendingComplaintCount)}</b></Link>
                <span className="dashboard-todo-item"><span>平台内容总量</span><b>{toNumber(stats?.packageCount) + toNumber(stats?.workCount)}</b></span>
              </div>
            </LedgerSection>
          </Col>
        </Row>
      </Spin>
    </AdminPageLayout>
  );
}
