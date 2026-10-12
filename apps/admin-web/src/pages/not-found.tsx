import type { ClientSession } from "@aicp/auth";
import { Button, Result } from "antd";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import { paths } from "../routes";
import { AdminPageLayout } from "../shared/shell";

export function NotFoundPage({
  session,
  tenantSlug,
  onLogout,
}: {
  session: ClientSession;
  tenantSlug: string;
  onLogout: () => void;
}): ReactNode {
  const navigate = useNavigate();
  return (
    <AdminPageLayout
      mainClassName="task-workspace template-workspace"
      session={session}
      tenantSlug={tenantSlug}
      onLogout={onLogout}
    >
      <Result
        status="404"
        title="404"
        subTitle="页面不存在"
        extra={
          <Button type="primary" onClick={() => void navigate(paths(tenantSlug).dashboard)}>
            返回首页
          </Button>
        }
      />
    </AdminPageLayout>
  );
}
