import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import {
  listApprovals,
  getApproval,
  resolveApproval,
} from "@/lib/approvals/approval-store";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request, {});
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const approval = getApproval(id);
    if (!approval) {
      return NextResponse.json({ error: "Approval not found" }, { status: 404 });
    }
    return NextResponse.json(approval);
  }

  const status = url.searchParams.get("status") ?? undefined;
  const approvals = listApprovals({
    tenantId: user.role === "admin" ? undefined : user.tenantId,
    status,
  });
  return NextResponse.json({ count: approvals.length, approvals });
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request, {});

  if (user.role !== "admin" && user.role !== "manager") {
    return NextResponse.json(
      { error: "Only admin or manager can approve/reject" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { id, action, reason } = body;

  if (!id || !action || !["approved", "rejected"].includes(action)) {
    return NextResponse.json(
      { error: "Required: id, action (approved|rejected)" },
      { status: 400 },
    );
  }

  const result = resolveApproval(id, action, user.email, reason);
  if (!result) {
    return NextResponse.json(
      { error: "Approval not found or already resolved" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
