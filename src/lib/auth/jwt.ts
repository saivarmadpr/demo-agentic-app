import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/data/rbac";

const JWT_SECRET_KEY = "demo-agentic-app-jwt-secret-key-change-in-prod";
const secret = new TextEncoder().encode(JWT_SECRET_KEY);

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role: Role;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}
