import type { ClientSession } from "@aicp/auth";
import { App as AntApp, Button, Table } from "antd";
import type { ReactNode } from "react";

import { OperationsHeader } from "../../shared/operations-header";
import { LedgerSection } from "../../shared/ledger-section";
import { AdminPageLayout } from "../../shared/shell";
import "./tables.css";

const tableData = [
  { key: "1", date: "2024-01-02", name: "张三", address: "上海市普陀区金沙江路 1518 弄" },
  { key: "2", date: "2024-01-04", name: "李四", address: "上海市普陀区金沙江路 1517 弄" },
  { key: "3", date: "2024-01-01", name: "王五", address: "上海市普陀区金沙江路 1519 弄" },
  { key: "4", date: "2024-01-03", name: "赵六", address: "上海市普陀区金沙江路 1516 弄" },
];

const columns = [
  { title: "日期", dataIndex: "date", key: "date" },
  { title: "姓名", dataIndex: "name", key: "name" },
  { title: "地址", dataIndex: "address", key: "address" },
];

const styles = [
  { id: "striped", title: "条纹边框风格" },
  { id: "card", title: "卡片式风格" },
  { id: "tech", title: "科技感风格" },
  { id: "business", title: "商务风格" },
  { id: "modern", title: "现代简约风格" },
] as const;

export function TablesPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const { message } = AntApp.useApp();

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader title="表格" description="对应原模板多种表格风格演示，组件换成 Ant Design Table。" />
      <div className="table-style-grid">
        {styles.map((style) => (
          <LedgerSection
            key={style.id}
            aria-label={style.title}
            toolbar={
              <div className="table-style-header">
                <h2>{style.title}</h2>
                <Button
                  type="link"
                  onClick={() => {
                    void navigator.clipboard.writeText(`.table-style--${style.id}`);
                    void message.success("已复制样式类名");
                  }}
                >
                  复制样式
                </Button>
              </div>
            }
          >
            <Table
              className={`table-style--${style.id}`}
              columns={columns}
              dataSource={tableData}
              pagination={false}
              size="small"
            />
          </LedgerSection>
        ))}
      </div>
    </AdminPageLayout>
  );
}
