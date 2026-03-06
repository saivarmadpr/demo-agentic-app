import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import { getAuditLog } from "@/lib/audit/audit-log";
import type { Role } from "@/data/rbac";
import { isValidRole } from "@/data/rbac";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request, {});

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Access denied: admin role required to view audit logs" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const roleParam = url.searchParams.get("role");

  const filters: { limit?: number; role?: Role } = {};
  if (limitParam) {
    filters.limit = parseInt(limitParam, 10) || 50;
  }
  if (roleParam && isValidRole(roleParam)) {
    filters.role = roleParam;
  }

  const logs = getAuditLog(filters);

  return NextResponse.json({
    count: logs.length,
    logs,
  });
}
