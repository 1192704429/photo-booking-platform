import type {
  DepartmentSummary,
  LearnerImportResult,
  ManagedAccount,
  ManagedLearner,
  PublicHttpOperationResponse,
  Role,
} from "@aicp/contracts";

import { createIdempotencyKey, requestOperation } from "./common";

export async function listDepartments(): Promise<DepartmentSummary[]> {
  return (await requestOperation("listDepartments")).departments;
}

export function createDepartment(input: {
  name: string;
  parentDepartmentId?: string;
}): Promise<DepartmentSummary> {
  return requestOperation("createDepartment", {
    headers: commandHeaders("create-department"),
    body: input,
  });
}

export async function updateDepartment(
  departmentId: string,
  input: { name: string; parentDepartmentId: string | null },
): Promise<DepartmentSummary> {
  return (
    await requestOperation("updateDepartment", {
      parameters: { departmentId },
      headers: commandHeaders("update-department"),
      body: input,
    })
  ).department;
}

export async function listLearners(): Promise<ManagedLearner[]> {
  return (await requestOperation("listLearners", {})).learners;
}

export type LearnerDirectorySummary = NonNullable<
  PublicHttpOperationResponse<"listLearners">["summary"]
>;

/** 学员搜索与 keyset 分页：大租户场景按关键词/部门逐页取数。 */
export async function queryLearners(input: {
  search?: string;
  departmentId?: string;
  disabled?: boolean;
  limit?: number;
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
}): Promise<{
  learners: ManagedLearner[];
  hasMore: boolean;
  nextCursor: string | undefined;
  summary?: LearnerDirectorySummary;
}> {
  const response = await requestOperation("listLearners", { query: input });
  return {
    learners: response.learners,
    hasMore: response.hasMore ?? false,
    nextCursor: response.nextCursor,
    ...(response.summary === undefined ? {} : { summary: response.summary }),
  };
}

export async function listAccounts(): Promise<ManagedAccount[]> {
  return (await requestOperation("listAccounts")).accounts;
}

export interface AccountPage {
  accounts: ManagedAccount[];
  hasMore: boolean;
  nextCursor?: string;
  summary?: AccountDirectorySummary;
}

export interface AccountDirectorySummary {
  totalCount: number;
  administratorCount: number;
  operatorCount: number;
  learnerCount: number;
  disabledCount: number;
}

export async function queryAccounts(input?: {
  search?: string;
  role?: Role;
  disabled?: boolean;
  limit?: number;
  cursor?: string;
}): Promise<AccountPage> {
  const response = await requestOperation(
    "listAccounts",
    input && Object.keys(input).length > 0 ? { query: input } : {},
  );
  return response;
}

export async function createLearner(input: {
  loginName: string;
  displayName: string;
  departmentId: string;
  initialPassword: string;
}): Promise<ManagedLearner> {
  return (
    await requestOperation("createLearner", {
      headers: commandHeaders("create-learner"),
      body: input,
    })
  ).learner;
}

export function importLearners(input: {
  departmentId: string;
  initialPassword: string;
  learners: Array<{ loginName: string; displayName: string }>;
}): Promise<LearnerImportResult> {
  return requestOperation("importLearners", {
    headers: commandHeaders("import-learners"),
    body: input,
  });
}

export async function updateLearner(
  accountId: string,
  input: { loginName: string; displayName: string; departmentId: string },
): Promise<ManagedLearner> {
  return (
    await requestOperation("updateLearner", {
      parameters: { accountId },
      headers: commandHeaders("update-learner"),
      body: input,
    })
  ).learner;
}

export async function updateAccountRoles(
  accountId: string,
  input: { roles: ManagedAccount["roles"]; departmentId?: string },
): Promise<ManagedAccount> {
  return (
    await requestOperation("updateAccountRoles", {
      parameters: { accountId },
      headers: commandHeaders("update-account-roles"),
      body: input,
    })
  ).account;
}

export async function setAccountDisabled(
  accountId: string,
  disabled: boolean,
): Promise<ManagedAccount> {
  return (
    await requestOperation("updateAccountStatus", {
      parameters: { accountId },
      headers: commandHeaders("update-account-status"),
      body: { disabled },
    })
  ).account;
}

function commandHeaders(action: string): HeadersInit {
  return {
    "content-type": "application/json",
    "idempotency-key": createIdempotencyKey(action),
  };
}
