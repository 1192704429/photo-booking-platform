import type { ClientSession } from "@aicp/auth";
import { Col, Empty, Row } from "antd";
import type { ReactNode } from "react";

import { OperationsHeader } from "../shared/operations-header";
import { AdminPageLayout } from "../shared/shell";
import { GeneratedChartPanel } from "./components/generated-chart-panel";
import { generatedProjectConfig } from "./project-config";

import "./generated-dashboard.css";

export function GeneratedDashboard({ session, tenantSlug, onLogout }: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const roles = session.account.roles.map(String);
  const charts = generatedProjectConfig.charts.filter((chart) => !chart.roles?.length || chart.roles.some((role) => roles.includes(role)));
  return (
    <AdminPageLayout mainClassName="task-workspace template-workspace" session={session} tenantSlug={tenantSlug} onLogout={onLogout}>
      <OperationsHeader title="数据概览" description="根据项目首页图表配置自动生成，并调用对应统计接口。" />
      {charts.length ? (
        <Row gutter={[16, 16]}>
          {charts.map((chart) => <Col key={`${chart.code}-${chart.roles?.join("-") ?? "all"}`} xs={24} xl={12}><GeneratedChartPanel chart={chart} /></Col>)}
        </Row>
      ) : <Empty description="当前角色暂无可查看的图表" />}
    </AdminPageLayout>
  );
}
