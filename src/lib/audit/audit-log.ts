import type { Role } from "@/data/rbac";
import type { RiskLevel } from "@/lib/guardrails/input-scanner";

export interface AuditEntry {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  email: string;
  role: Role;
  authMethod: string;
  message: string;
  toolCalls: Array<{
    name: string;
    allowed: boolean;
    rbacNote?: string;
    rateLimited?: boolean;
  }>;
  inputRiskLevel: RiskLevel;
  inputTriggers: string[];
  outputDetections: string[];
  outputBlocked: boolean;
  responseStatus: number;
}

// In-memory store
const auditLog: AuditEntry[] = [];
let nextId = 1;

export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: nextId++,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getAuditLog(filters?: {
  limit?: number;
  role?: Role;
  userId?: number;
}): AuditEntry[] {
  let results = [...auditLog];

  if (filters?.role) {
    results = results.filter((e) => e.role === filters.role);
  }
  if (filters?.userId !== undefined) {
    results = results.filter((e) => e.userId === filters.userId);
  }

  // Most recent first
  results.reverse();

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}
