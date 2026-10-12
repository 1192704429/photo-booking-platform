import { type EChartsOption, init } from "echarts";
import { type ReactNode, useEffect, useRef } from "react";

export function ChartCard({ option }: { option: EChartsOption }): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);
  const optionKey = JSON.stringify(option);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = init(host);
    chart.setOption(JSON.parse(optionKey) as EChartsOption);
    const resize = (): void => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [optionKey]);

  return <div ref={hostRef} style={{ height: 280 }} />;
}
