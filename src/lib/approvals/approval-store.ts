import { appConfig } from "@/data/config";

export interface ApprovalRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  userId: string;
  tenantId: string;
  status: "pending" | "approved" | "rejected";
  reason?: string;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

const approvals = new Map<string, ApprovalRequest>();

const HIGH_RISK_TOOLS: Record<string, (args: Record<string, unknown>) => boolean> = {
  send_email: (args) => {
    const to = (args.to as string) || "";
    return !to.endsWith("@acme.com") && !to.endsWith("@globex.com");
  },
  gist_create: () => true,
  http_request: (args) => {
    const url = (args.url as string) || "";
    return !url.includes("localhost") && !url.includes("127.0.0.1") &&
      !url.includes("10.0.") && !url.includes("192.168.");
  },
  db_query: (args) => {
    const q = ((args.query as string) || "").toLowerCase();
    return q.includes("drop") || q.includes("delete") || q.includes("truncate");
  },
  create_invoice: () => true,
  process_payment: () => true,
  transfer_funds: (args) => {
    const amount = Number(args.amount) || 0;
    return amount > 1000;
  },
};

export function requiresApproval(
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  if (!appConfig.approvalRequired) return false;
  const checker = HIGH_RISK_TOOLS[toolName];
  if (!checker) return false;
  return checker(args);
}

export function createApproval(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  tenantId: string,
): ApprovalRequest {
  const id = `appr_${crypto.randomUUID().slice(0, 8)}`;
  const req: ApprovalRequest = {
    id,
    toolName,
    args,
    userId,
    tenantId,
    status: "pending",
    createdAt: Date.now(),
  };
  approvals.set(id, req);
  return req;
}

export function getApproval(id: string): ApprovalRequest | null {
  return approvals.get(id) ?? null;
}

export function resolveApproval(
  id: string,
  action: "approved" | "rejected",
  resolvedBy: string,
  reason?: string,
): ApprovalRequest | null {
  const req = approvals.get(id);
  if (!req || req.status !== "pending") return null;
  req.status = action;
  req.resolvedAt = Date.now();
  req.resolvedBy = resolvedBy;
  req.reason = reason;
  return req;
}

export function listApprovals(filters?: {
  tenantId?: string;
  status?: string;
}): ApprovalRequest[] {
  let results = Array.from(approvals.values());
  if (filters?.tenantId) {
    results = results.filter((r) => r.tenantId === filters.tenantId);
  }
  if (filters?.status) {
    results = results.filter((r) => r.status === filters.status);
  }
  return results.sort((a, b) => b.createdAt - a.createdAt);
}
