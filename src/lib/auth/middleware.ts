import { NextRequest } from "next/server";
import type { Role } from "@/data/rbac";
import { FAKE_API_KEYS, isValidRole } from "@/data/rbac";
import { verifyToken } from "./jwt";

export interface ResolvedUser {
  userId: number;
  name: string;
  email: string;
  role: Role;
  authMethod: "jwt" | "api_key" | "body_role" | "default";
}

export async function resolveUser(
  request: NextRequest,
  body: Record<string, unknown>
): Promise<ResolvedUser> {
  // Priority 1: JWT Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload) {
      return {
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        authMethod: "jwt",
      };
    }
  }

  // Priority 2: X-Api-Key header
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && FAKE_API_KEYS[apiKey]) {
    const u = FAKE_API_KEYS[apiKey];
    return { ...u, authMethod: "api_key" };
  }

  // Priority 3: api_key in body
  if (body.api_key && typeof body.api_key === "string" && FAKE_API_KEYS[body.api_key]) {
    const u = FAKE_API_KEYS[body.api_key];
    return { ...u, authMethod: "api_key" };
  }

  // Priority 4: role in body (test mode)
  if (body.role && typeof body.role === "string" && isValidRole(body.role)) {
    return {
      role: body.role as Role,
      name: `TestUser (${body.role})`,
      email: `test-${body.role}@acme.com`,
      userId: 0,
      authMethod: "body_role",
    };
  }

  // Default: viewer (least privilege)
  return {
    role: "viewer",
    name: "Anonymous",
    email: "anonymous@acme.com",
    userId: 0,
    authMethod: "default",
  };
}
