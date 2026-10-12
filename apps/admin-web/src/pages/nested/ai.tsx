import type { ClientSession } from "@aicp/auth";
import { Button, Input, Space } from "antd";
import { type ReactNode, useState } from "react";

import { OperationsHeader } from "../../shared/operations-header";
import { LedgerSection } from "../../shared/ledger-section";
import { AdminPageLayout } from "../../shared/shell";

export function NestedAiPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const [question, setQuestion] = useState("");
  const [responseText, setResponseText] = useState("");

  function send(): void {
    const next = question.trim();
    if (!next) return;
    setResponseText((current) => `${current}${current ? "\n\n" : ""}问：${next}\n答：这是模板内的本地演示回复，未连接原 Vue 项目的流式接口。`);
    setQuestion("");
  }

  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <OperationsHeader title="AI 问答" description="对应原模板 Menu1 / DeepSeek 演示页。" />
      <LedgerSection aria-label="AI 问答">
        <div className="template-stack" style={{ padding: 24 }}>
          <Space.Compact style={{ width: "100%", maxWidth: 560 }}>
            <Input
              value={question}
              placeholder="输入问题..."
              onChange={(event) => setQuestion(event.target.value)}
              onPressEnter={send}
            />
            <Button type="primary" onClick={send}>
              发送
            </Button>
          </Space.Compact>
          <pre className="template-pre">{responseText || "等待提问"}</pre>
        </div>
      </LedgerSection>
    </AdminPageLayout>
  );
}
