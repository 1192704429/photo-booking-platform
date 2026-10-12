import type { FromJsonSchema } from "./public-http-schema";
import {
  departmentSummarySchema,
  learnerImportResultSchema,
  loginResponseSchema,
  managedAccountSchema,
  managedLearnerSchema,
  roleSchema,
} from "./identity-http-schemas";

/**
 * identity 公开模型由运行时 JSON Schema 推导（identity-http-schemas 单一权威），
 * 避免同一字段形状在 schema 与手写 interface 两套契约中重复维护、漂移。
 * 改字段只需改 schema，模型类型自动收敛。
 */
export type Role = FromJsonSchema<typeof roleSchema>;

export type DepartmentSummary = FromJsonSchema<typeof departmentSummarySchema>;

export type ManagedLearner = FromJsonSchema<typeof managedLearnerSchema>;

export type ManagedAccount = FromJsonSchema<typeof managedAccountSchema>;

export type LearnerImportResult = FromJsonSchema<typeof learnerImportResultSchema>;

export type LoginResponse = FromJsonSchema<typeof loginResponseSchema>;
