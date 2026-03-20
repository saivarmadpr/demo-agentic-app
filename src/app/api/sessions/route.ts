import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import { listSessions, getSession, deleteSession } from "@/lib/sessions/session-store";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request, {});
  const userId = user.userId > 0 ? String(user.userId) : user.email;

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("id");

  if (sessionId) {
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (user.role !== "admin" && session.userId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({
      id: session.id,
      userId: session.userId,
      role: session.role,
      tenantId: session.tenantId,
      messageCount: session.messages.length,
      createdAt: new Date(session.createdAt).toISOString(),
      lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
      messages:
        user.role === "admin"
          ? session.messages
          : session.messages.map((m) => ({
            role: m.role,
            contentPreview: typeof m.content === "string" ? m.content.slice(0, 100) : "[complex]",
          })),
    });
  }

  const sessions =
    user.role === "admin"
      ? listSessions(undefined, user.tenantId)
      : listSessions(userId, user.tenantId);

  return NextResponse.json({
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      role: s.role,
      tenantId: s.tenantId,
      messageCount: s.messages.length,
      createdAt: new Date(s.createdAt).toISOString(),
      lastAccessedAt: new Date(s.lastAccessedAt).toISOString(),
    })),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await resolveUser(request, {});
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("id");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const userId = user.userId > 0 ? String(user.userId) : user.email;
  if (user.role !== "admin" && session.userId !== userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  deleteSession(sessionId);
  return NextResponse.json({ deleted: true, id: sessionId });
}
