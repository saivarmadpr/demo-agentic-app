import { NextRequest } from "next/server";
import type { Role } from "@/data/rbac";
import { FAKE_API_KEYS, isValidRole } from "@/data/rbac";
import { verifyToken } from "./jwt";
import { findUserByEmail } from "./users";
import type { TenantId, ConsentFlags } from "./users";

export interface ResolvedUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
  tenantId: TenantId;
  consent: ConsentFlags;
  authMethod: "jwt" | "api_key" | "body_role" | "default";
}

const DEFAULT_CONSENT: ConsentFlags = {
  dataSharing: false,
  analytics: false,
  thirdPartyAccess: false,
  piiProcessing: false,
};

export async function resolveUser(
  request: NextRequest,
  body: Record<string, unknown>,
): Promise<ResolvedUser> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload) {
      const dbUser = findUserByEmail(payload.email);
      return {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tenantId: (payload as unknown as { tenantId?: TenantId }).tenantId ??
          dbUser?.tenantId ?? "acme",
        consent: dbUser?.consent ?? DEFAULT_CONSENT,
        authMethod: "jwt",
      };
    }
  }

  const apiKey = request.headers.get("x-api-key");
  if (apiKey && FAKE_API_KEYS[apiKey]) {
    const u = FAKE_API_KEYS[apiKey];
    const dbUser = findUserByEmail(u.email);
    return {
      ...u,
      tenantId: dbUser?.tenantId ?? "acme",
      consent: dbUser?.consent ?? DEFAULT_CONSENT,
      authMethod: "api_key",
    };
  }

  if (
    body.api_key &&
    typeof body.api_key === "string" &&
    FAKE_API_KEYS[body.api_key]
  ) {
    const u = FAKE_API_KEYS[body.api_key];
    const dbUser = findUserByEmail(u.email);
    return {
      ...u,
      tenantId: dbUser?.tenantId ?? "acme",
      consent: dbUser?.consent ?? DEFAULT_CONSENT,
      authMethod: "api_key",
    };
  }

  if (body.role && typeof body.role === "string" && isValidRole(body.role)) {
    return {
      role: body.role as Role,
      name: `TestUser (${body.role})`,
      email: `test-${body.role}@acme.com`,
      userId: 0,
      tenantId: (body.tenant_id as TenantId) || "acme",
      consent: DEFAULT_CONSENT,
      authMethod: "body_role",
    };
  }

  return {
    role: "viewer",
    name: "Anonymous",
    email: "anonymous@acme.com",
    userId: 0,
    tenantId: "acme",
    consent: DEFAULT_CONSENT,
    authMethod: "default",
  };
}
