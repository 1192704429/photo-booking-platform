import {
  displayNameSchema,
  loginNameSchema,
  objectSchema,
  stringSchema,
  titleSchema,
} from "./public-http-schema";

export const roleSchema = {
  type: "string",
  enum: ["enterprise-administrator", "training-operator", "learner"],
} as const;

export const departmentSummarySchema = objectSchema(["id", "name"], {
  id: stringSchema,
  name: titleSchema,
  parentDepartmentId: stringSchema,
});

export const managedLearnerSchema = objectSchema(
  [
    "id",
    "loginName",
    "displayName",
    "departmentId",
    "roles",
    "disabled",
    "mustChangePassword",
    "createdAt",
  ],
  {
    id: stringSchema,
    loginName: loginNameSchema,
    displayName: displayNameSchema,
    departmentId: stringSchema,
    roles: { type: "array", items: roleSchema },
    disabled: { type: "boolean" },
    mustChangePassword: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
);

export const managedAccountSchema = objectSchema(
  ["id", "loginName", "displayName", "roles", "disabled", "mustChangePassword"],
  {
    id: stringSchema,
    loginName: loginNameSchema,
    displayName: displayNameSchema,
    roles: { type: "array", items: roleSchema },
    disabled: { type: "boolean" },
    mustChangePassword: { type: "boolean" },
  },
);

export const learnerImportResultSchema = objectSchema(["batchId", "learners"], {
  batchId: stringSchema,
  learners: { type: "array", items: managedLearnerSchema },
});

export const loginResponseSchema = objectSchema(["account", "tenant"], {
  account: objectSchema(["loginName", "roles", "mustChangePassword"], {
    loginName: loginNameSchema,
    roles: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "platform-administrator",
          "enterprise-administrator",
          "training-operator",
          "learner",
          "azhou",
          "editor",
          "admin",
          "client",
        ],
      },
    },
    mustChangePassword: { type: "boolean" },
  }),
  tenant: objectSchema(["organizationName", "slug"], {
    organizationName: titleSchema,
    slug: stringSchema,
  }),
});
