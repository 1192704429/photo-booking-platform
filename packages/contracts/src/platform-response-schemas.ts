import { objectSchema, stringSchema } from "./public-http-schema";

export const provisionTenantResponseSchema = objectSchema(["id", "loginPath"], {
  id: stringSchema,
  loginPath: stringSchema,
});

/** 租户列表条目：平台控制台租户管理页展示字段。 */
export const tenantListItemSchema = objectSchema(
  ["id", "organizationName", "slug", "status", "createdAt", "initialAdministrator"],
  {
    id: stringSchema,
    organizationName: stringSchema,
    slug: stringSchema,
    status: { type: "string", enum: ["active", "suspended"] },
    createdAt: { type: "string", format: "date-time" },
    initialAdministrator: stringSchema,
  },
);

export const listTenantsResponseSchema = objectSchema(["tenants"], {
  tenants: { type: "array", items: tenantListItemSchema },
});

export const tenantOrganizationResponseSchema = objectSchema(["organizationName"], {
  organizationName: stringSchema,
});

export const tenantStatusResponseSchema = objectSchema(["status"], {
  status: { type: "string", enum: ["active", "suspended"] },
});

export const tenantLoginAddressResponseSchema = objectSchema(["loginPath"], {
  loginPath: stringSchema,
});
