import { platformIdentityHttpContracts } from "./public-http-registries/platform-identity";

import type { PublicHttpContract } from "./public-http-schema";

/** 所有公开 HTTP operation 的唯一 registry；领域模块只在各自文件中定义一次。 */
export const publicHttpContracts = {
  ...platformIdentityHttpContracts,
} satisfies Record<string, PublicHttpContract>;
