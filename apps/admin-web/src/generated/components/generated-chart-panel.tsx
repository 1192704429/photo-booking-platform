import { App as AntApp, Button, DatePicker, Form, Input, InputNumber, Select, Spin } from "antd";
import type { EChartsOption } from "echarts";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ChartCard } from "../../pages/charts/chart-card";
import { LedgerSection } from "../../shared/ledger-section";
import { generatedRequest } from "../api";
import type { GeneratedChart, GeneratedChartParam } from "../types";

interface ChartDatum { name: string; value: unknown }

function buildOption(chart: GeneratedChart, data: ChartDatum[]): EChartsOption {
  const values = data.map((item) => item.value as number);
  if (["BasicPieChart", "CircularPieChart", "FlorenceNightingaleRoseChart"].includes(chart.type)) {
    return {
      tooltip: { trigger: "item" },
      legend: { bottom: 0, type: "scroll" },
      series: [{
        name: chart.title,
        type: "pie",
        radius: chart.type === "CircularPieChart" ? ["42%", "68%"] : "68%",
        ...(chart.type === "FlorenceNightingaleRoseChart" ? { roseType: "area" as const } : {}),
        data: data.map((item) => ({ name: item.name, value: item.value as number })),
      }],
    };
  }
  return {
    tooltip: { trigger: "axis" },
    grid: { left: 36, right: 20, top: 24, bottom: 42, containLabel: true },
    xAxis: { type: "category", data: data.map((item) => item.name), axisLabel: { interval: 0, rotate: data.length > 8 ? 25 : 0 } },
    yAxis: { type: "value" },
    series: [{ type: chart.type === "BasicLineChart" ? "line" : "bar", data: values, smooth: chart.type === "BasicLineChart" }],
  };
}

function rangeGroups(params: GeneratedChartParam[]): Array<{ key: string; label: string; names: string[] }> {
  const groups = new Map<string, { key: string; label: string; names: string[] }>();
  params.filter((item) => item.componentType === "timeRange").forEach((param) => {
    const key = param.bindGroup || "timeRange";
    const current = groups.get(key) ?? { key, label: param.label || "时间范围", names: [] };
    current.names.push(param.paramName);
    groups.set(key, current);
  });
  return [...groups.values()];
}

export function GeneratedChartPanel({ chart }: { chart: GeneratedChart }): ReactNode {
  const { message } = AntApp.useApp();
  const [data, setData] = useState<ChartDatum[]>([]);
  const [loading, setLoading] = useState(false);
  const params = chart.params ?? [];
  const ranges = useMemo(() => rangeGroups(params), [params]);
  const initialValues = useMemo(() => Object.fromEntries(
    params.filter((item) => item.defaultValue !== undefined).map((item) => [item.paramName, item.defaultValue]),
  ), [params]);

  async function load(values: Record<string, unknown> = initialValues): Promise<void> {
    const payload = { ...values };
    for (const range of ranges) {
      const selected = payload[`range:${range.key}`] as Array<{ format: (format: string) => string }> | undefined;
      delete payload[`range:${range.key}`];
      range.names.slice(0, 2).forEach((name, index) => {
        payload[name] = selected?.[index]?.format("YYYY-MM-DD HH:mm:ss") ?? "";
      });
    }
    setLoading(true);
    try {
      const result = await generatedRequest<ChartDatum[]>(`/echarts/${chart.code}`, params.length ? "POST" : "GET", params.length ? payload : undefined);
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      void message.error(error instanceof Error ? error.message : `${chart.title}加载失败`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* generated chart config is immutable */ /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [chart.code]);

  const toolbar = params.length ? (
    <Form layout="inline" size="small" initialValues={initialValues} onFinish={(values) => void load(values)}>
      {ranges.map((range) => (
        <Form.Item key={range.key} name={`range:${range.key}`} label={range.label}>
          <DatePicker.RangePicker showTime />
        </Form.Item>
      ))}
      {params.filter((param) => param.componentType !== "timeRange").map((param) => (
        <Form.Item key={param.paramName} name={param.paramName} label={param.label || param.paramName}>
          {param.componentType === "select" ? <Select options={param.options ?? []} style={{ minWidth: 140 }} />
            : param.componentType === "numberInput" ? <InputNumber />
              : <Input allowClear />}
        </Form.Item>
      ))}
      <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item>
    </Form>
  ) : undefined;

  return (
    <LedgerSection toolbar={toolbar} aria-label={chart.title}>
      <div className="generated-chart-panel__title">{chart.title}</div>
      <Spin spinning={loading}><ChartCard option={buildOption(chart, data)} /></Spin>
    </LedgerSection>
  );
}
