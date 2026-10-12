import type { ClientSession } from "@aicp/auth";
import { Col, Form, Input, Row } from "antd";
import { type ReactNode, useMemo, useState } from "react";

import { OperationsHeader } from "../../shared/operations-header";
import { LedgerSection } from "../../shared/ledger-section";
import { AdminPageLayout } from "../../shared/shell";
import { ChartCard } from "./chart-card";

const sampleBar = [
  { name: "星期一", value: 50 },
  { name: "星期二", value: 60 },
  { name: "星期三", value: 40 },
  { name: "星期四", value: 70 },
];

const samplePie = [
  { name: "星期一", value: 50 },
  { name: "星期二", value: 60 },
  { name: "星期三", value: 40 },
  { name: "星期四", value: 70 },
];

export function ChartsPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const [queryId, setQueryId] = useState("");
  const [queryVal, setQueryVal] = useState("");
  const filtered = useMemo(() => {
    if (!queryId && !queryVal) return sampleBar;
    return sampleBar.filter(
      (item) =>
        (!queryId || item.name.includes(queryId)) &&
        (!queryVal || String(item.value).includes(queryVal)),
    );
  }, [queryId, queryVal]);

  const queryForm = (
    <Form layout="inline" size="small">
      <Form.Item label="名称">
        <Input value={queryId} onChange={(event) => setQueryId(event.target.value)} placeholder="过滤名称" />
      </Form.Item>
      <Form.Item label="值">
        <Input value={queryVal} onChange={(event) => setQueryVal(event.target.value)} placeholder="过滤值" />
      </Form.Item>
    </Form>
  );

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader title="图表" description="对应原模板 echarts 演示页，使用 ECharts 绘制。" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <LedgerSection toolbar={queryForm} aria-label="柱状图">
            <ChartCard
              option={{
                tooltip: { trigger: "axis" },
                xAxis: { type: "category", data: filtered.map((item) => item.name) },
                yAxis: { type: "value" },
                series: [{ type: "bar", data: filtered.map((item) => item.value) }],
              }}
            />
          </LedgerSection>
        </Col>
        <Col xs={24} lg={8}>
          <LedgerSection aria-label="饼图">
            <ChartCard
              option={{
                tooltip: { trigger: "item" },
                series: [
                  {
                    type: "pie",
                    radius: "68%",
                    data: samplePie.map((item) => ({ name: item.name, value: item.value })),
                  },
                ],
              }}
            />
          </LedgerSection>
        </Col>
        <Col xs={24} lg={8}>
          <LedgerSection aria-label="折线图">
            <ChartCard
              option={{
                tooltip: { trigger: "axis" },
                xAxis: { type: "category", data: sampleBar.map((item) => item.name) },
                yAxis: { type: "value" },
                series: [{ type: "line", data: sampleBar.map((item) => item.value), smooth: true }],
              }}
            />
          </LedgerSection>
        </Col>
        <Col xs={24} lg={8}>
          <LedgerSection aria-label="环形图">
            <ChartCard
              option={{
                tooltip: { trigger: "item" },
                series: [
                  {
                    type: "pie",
                    radius: ["42%", "68%"],
                    data: sampleBar.map((item) => ({ name: item.name, value: item.value })),
                  },
                ],
              }}
            />
          </LedgerSection>
        </Col>
        <Col xs={24} lg={8}>
          <LedgerSection aria-label="南丁格尔玫瑰图">
            <ChartCard
              option={{
                tooltip: { trigger: "item" },
                series: [
                  {
                    type: "pie",
                    roseType: "area",
                    radius: [20, 110],
                    data: samplePie.map((item) => ({ name: item.name, value: item.value })),
                  },
                ],
              }}
            />
          </LedgerSection>
        </Col>
      </Row>
    </AdminPageLayout>
  );
}
