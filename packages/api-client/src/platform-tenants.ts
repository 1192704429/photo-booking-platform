import type { PublicHttpOperationResponse } from "@aicp/contracts";

import { requestOperation } from "./common";

export type PlatformTenant = PublicHttpOperationResponse<"listTenants">["tenants"][number];

export interface CreatePlatformTenantInput {
  organizationName: string;
  slug: string;
  initialAdministrator: { loginName: string; password: string };
}

export async function listPlatformTenants(): Promise<PlatformTenant[]> {
  return (await requestOperation("listTenants")).tenants;
}

export async function createPlatformTenant(input: CreatePlatformTenantInput): Promise<{
  id: string;
  loginPath: string;
}> {
  return requestOperation("provisionTenant", { body: input });
}
