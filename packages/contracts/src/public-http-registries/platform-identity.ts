import {
  loginNameSchema,
  objectSchema,
  operation,
  pageQueryProperties,
  passwordSchema,
  stringSchema,
  tenantSlugHeader,
  titleSchema,
  uuidSchema,
  tenantSlugSchema,
  displayNameSchema,
} from "../public-http-schema";
import {
  departmentSummarySchema,
  learnerImportResultSchema,
  loginResponseSchema,
  managedAccountSchema,
  managedLearnerSchema,
} from "../identity-http-schemas";
import type { PublicHttpContract } from "../public-http-schema";
import {
  listTenantsResponseSchema,
  provisionTenantResponseSchema,
  tenantLoginAddressResponseSchema,
  tenantOrganizationResponseSchema,
  tenantStatusResponseSchema,
} from "../platform-response-schemas";

export const platformIdentityHttpContracts = {
  provisionTenant: operation(
    "POST",
    "/api/platform/tenants",
    201,
    {
      body: objectSchema(["organizationName", "slug", "initialAdministrator"], {
        organizationName: titleSchema,
        slug: tenantSlugSchema,
        initialAdministrator: objectSchema(["loginName", "password"], {
          loginName: loginNameSchema,
          password: passwordSchema,
        }),
      }),
    },
    provisionTenantResponseSchema,
  ),
  listTenants: operation("GET", "/api/platform/tenants", 200, {}, listTenantsResponseSchema),
  updateTenantOrganization: operation(
    "POST",
    "/api/platform/tenants/:tenantId/organization",
    200,
    {
      params: objectSchema(["tenantId"], { tenantId: uuidSchema }),
      body: objectSchema(["organizationName"], {
        organizationName: titleSchema,
      }),
    },
    tenantOrganizationResponseSchema,
  ),
  updateTenantStatus: operation(
    "POST",
    "/api/platform/tenants/:tenantId/status",
    200,
    {
      params: objectSchema(["tenantId"], { tenantId: uuidSchema }),
      body: objectSchema(["status"], {
        status: { type: "string", enum: ["active", "suspended"] },
      }),
    },
    tenantStatusResponseSchema,
  ),
  updateTenantLoginAddress: operation(
    "POST",
    "/api/platform/tenants/:tenantId/login-address",
    200,
    {
      params: objectSchema(["tenantId"], { tenantId: uuidSchema }),
      body: objectSchema(["slug"], {
        slug: tenantSlugSchema,
      }),
    },
    tenantLoginAddressResponseSchema,
  ),
  resetInitialEnterpriseAdministratorPassword: operation(
    "POST",
    "/api/platform/tenants/:tenantId/initial-administrator/password-reset",
    204,
    {
      params: objectSchema(["tenantId"], { tenantId: uuidSchema }),
      body: objectSchema(["newPassword"], { newPassword: passwordSchema }),
    },
  ),
  platformLogin: operation("POST", "/api/platform/login", 204, {
    body: objectSchema(["key"], {
      key: { type: "string", minLength: 1, maxLength: 1000 },
    }),
  }),
  platformLogout: operation("POST", "/api/platform/logout", 204),
  login: operation(
    "POST",
    "/api/auth/login",
    200,
    {
      headers: objectSchema([tenantSlugHeader], {
        [tenantSlugHeader]: { type: "string", minLength: 1 },
      }),
      body: objectSchema(["loginName", "password"], {
        loginName: loginNameSchema,
        password: { type: "string", minLength: 1, maxLength: 200 },
      }),
    },
    loginResponseSchema,
  ),
  logout: operation("POST", "/api/auth/logout", 204),
  changePassword: operation("POST", "/api/auth/password", 204, {
    body: objectSchema(["currentPassword", "newPassword"], {
      currentPassword: { type: "string", minLength: 1, maxLength: 200 },
      newPassword: passwordSchema,
    }),
  }),
  createDepartment: operation(
    "POST",
    "/api/admin/departments",
    201,
    {
      body: objectSchema(["name"], {
        name: titleSchema,
        parentDepartmentId: stringSchema,
      }),
    },
    departmentSummarySchema,
  ),
  listDepartments: operation(
    "GET",
    "/api/admin/departments",
    200,
    {},
    objectSchema(["departments"], {
      departments: { type: "array", items: departmentSummarySchema },
    }),
  ),
  updateDepartment: operation(
    "POST",
    "/api/admin/departments/:departmentId",
    200,
    {
      params: objectSchema(["departmentId"], { departmentId: stringSchema }),
      body: objectSchema(["name", "parentDepartmentId"], {
        name: titleSchema,
        parentDepartmentId: { type: ["string", "null"] },
      }),
    },
    objectSchema(["department"], { department: departmentSummarySchema }),
  ),
  createLearner: operation(
    "POST",
    "/api/admin/learners",
    201,
    {
      body: objectSchema(["loginName", "displayName", "departmentId", "initialPassword"], {
        loginName: loginNameSchema,
        displayName: displayNameSchema,
        departmentId: stringSchema,
        initialPassword: passwordSchema,
      }),
    },
    objectSchema(["learner"], { learner: managedLearnerSchema }),
  ),
  listLearners: operation(
    "GET",
    "/api/admin/learners",
    200,
    {
      querystring: objectSchema([], {
        search: { type: "string", maxLength: 100 },
        departmentId: stringSchema,
        disabled: { type: "boolean" },
        createdAfter: { type: "string", format: "date-time" },
        createdBefore: { type: "string", format: "date-time" },
        ...pageQueryProperties,
      }),
    },
    objectSchema(["learners"], {
      learners: { type: "array", items: managedLearnerSchema },
      summary: objectSchema(
        [
          "totalCount",
          "activeCount",
          "disabledCount",
          "mustChangePasswordCount",
          "departmentLearnerCounts",
        ],
        {
          totalCount: { type: "integer", minimum: 0 },
          activeCount: { type: "integer", minimum: 0 },
          disabledCount: { type: "integer", minimum: 0 },
          mustChangePasswordCount: { type: "integer", minimum: 0 },
          departmentLearnerCounts: {
            type: "array",
            items: objectSchema(["departmentId", "learnerCount"], {
              departmentId: stringSchema,
              learnerCount: { type: "integer", minimum: 0 },
            }),
          },
        },
      ),
      hasMore: { type: "boolean" },
      nextCursor: { type: "string" },
    }),
  ),
  updateLearner: operation(
    "POST",
    "/api/admin/learners/:accountId",
    200,
    {
      params: objectSchema(["accountId"], { accountId: stringSchema }),
      body: objectSchema(["loginName", "displayName", "departmentId"], {
        loginName: loginNameSchema,
        displayName: displayNameSchema,
        departmentId: stringSchema,
      }),
    },
    objectSchema(["learner"], { learner: managedLearnerSchema }),
  ),
  importLearners: operation(
    "POST",
    "/api/admin/learners/imports",
    201,
    {
      body: objectSchema(["departmentId", "initialPassword", "learners"], {
        departmentId: stringSchema,
        initialPassword: passwordSchema,
        learners: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          items: objectSchema(["loginName", "displayName"], {
            loginName: loginNameSchema,
            displayName: displayNameSchema,
          }),
        },
      }),
    },
    learnerImportResultSchema,
  ),
  listAccounts: operation(
    "GET",
    "/api/admin/accounts",
    200,
    {
      querystring: objectSchema([], {
        search: { type: "string", maxLength: 100 },
        role: {
          type: "string",
          enum: ["enterprise-administrator", "training-operator", "learner"],
        },
        disabled: { type: "boolean" },
        ...pageQueryProperties,
      }),
    },
    objectSchema(["accounts", "hasMore"], {
      accounts: { type: "array", items: managedAccountSchema },
      summary: objectSchema(
        ["totalCount", "administratorCount", "operatorCount", "learnerCount", "disabledCount"],
        {
          totalCount: { type: "integer", minimum: 0 },
          administratorCount: { type: "integer", minimum: 0 },
          operatorCount: { type: "integer", minimum: 0 },
          learnerCount: { type: "integer", minimum: 0 },
          disabledCount: { type: "integer", minimum: 0 },
        },
      ),
      hasMore: { type: "boolean" },
      nextCursor: { type: "string" },
    }),
  ),
  updateAccountRoles: operation(
    "POST",
    "/api/admin/accounts/:accountId/roles",
    200,
    {
      params: objectSchema(["accountId"], { accountId: stringSchema }),
      body: objectSchema(["roles"], {
        roles: {
          type: "array",
          maxItems: 3,
          uniqueItems: true,
          items: {
            type: "string",
            enum: ["enterprise-administrator", "training-operator", "learner"],
          },
        },
        departmentId: stringSchema,
      }),
    },
    objectSchema(["account"], { account: managedAccountSchema }),
  ),
  updateAccountStatus: operation(
    "POST",
    "/api/admin/accounts/:accountId/status",
    200,
    {
      params: objectSchema(["accountId"], { accountId: stringSchema }),
      body: objectSchema(["disabled"], { disabled: { type: "boolean" } }),
    },
    objectSchema(["account"], { account: managedAccountSchema }),
  ),
  resetAccountPassword: operation("POST", "/api/admin/accounts/:accountId/password-reset", 204, {
    params: objectSchema(["accountId"], { accountId: stringSchema }),
    body: objectSchema(["newPassword"], { newPassword: passwordSchema }),
  }),
} satisfies Record<string, PublicHttpContract>;
