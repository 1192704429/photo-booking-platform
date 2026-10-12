import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import type { ReactNode } from "react";

const theme = {
  token: {
    colorPrimary: "#25636a",
    colorInfo: "#25636a",
    colorSuccess: "#2f7668",
    colorWarning: "#b7791f",
    colorError: "#b42318",
    colorText: "#1f2933",
    colorTextSecondary: "#66727c",
    colorBorder: "#d9e0e4",
    colorBgLayout: "#f5f7f8",
    colorBgContainer: "#ffffff",
    borderRadius: 6,
    borderRadiusLG: 10,
    fontFamily:
      'Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
    fontSize: 14,
    controlHeight: 36,
    boxShadowSecondary: "0 8px 24px rgb(31 41 51 / 7%)",
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      fontWeight: 600,
      primaryShadow: "none",
    },
    Input: {
      borderRadius: 6,
      controlHeight: 36,
      paddingInline: 11,
    },
    InputNumber: { borderRadius: 6, controlHeight: 36 },
    Select: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 16,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Segmented: { borderRadius: 6, itemSelectedBg: "#ffffff" },
    Tabs: {
      titleFontSize: 14,
    },
  },
};

export function AppProviders({ children }: { children: ReactNode }): ReactNode {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
