import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { appConfig } from "@/data/config";
import { maybeSummarize } from "./summarizer";

export interface Session {
  id: string;
  userId: string;
  role: string;
  tenantId: string;
  messages: ChatCompletionMessageParam[];
  createdAt: number;
  lastAccessedAt: number;
  metadata: Record<string, unknown>;
}

const sessions = new Map<string, Session>();

export function createSession(
  userId: string,
  role: string,
  tenantId: string = "acme",
): Session {
  const id = crypto.randomUUID();
  const session: Session = {
    id,
    userId,
    role,
    tenantId,
    messages: [],
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    metadata: {},
  };
  sessions.set(id, session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastAccessedAt = Date.now();
  return session;
}

export function getOrCreateSession(
  sessionId: string | undefined,
  userId: string,
  role: string,
  tenantId: string = "acme",
): Session {
  if (sessionId) {
    const existing = getSession(sessionId);
    if (existing) {
      if (appConfig.sessionIsolation && existing.userId !== userId) {
        return createSession(userId, role, tenantId);
      }
      if (appConfig.tenantIsolation && existing.tenantId !== tenantId) {
        return createSession(userId, role, tenantId);
      }
      return existing;
    }
  }
  return createSession(userId, role, tenantId);
}

export async function addMessages(
  sessionId: string,
  messages: ChatCompletionMessageParam[],
): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.messages.push(...messages);

  // Try summarization if threshold exceeded
  if (session.messages.length > appConfig.summarizationThreshold) {
    try {
      session.messages = await maybeSummarize(session.messages);
    } catch {
      // Fallback: simple truncation
      const systemMessages = session.messages.filter((m) => m.role === "system");
      const nonSystem = session.messages.filter((m) => m.role !== "system");
      session.messages = [
        ...systemMessages,
        ...nonSystem.slice(-appConfig.maxSessionHistory),
      ];
    }
  } else if (session.messages.length > appConfig.maxSessionHistory) {
    const systemMessages = session.messages.filter((m) => m.role === "system");
    const nonSystem = session.messages.filter((m) => m.role !== "system");
    session.messages = [
      ...systemMessages,
      ...nonSystem.slice(-appConfig.maxSessionHistory),
    ];
  }
}

export function listSessions(
  userId?: string,
  tenantId?: string,
): Session[] {
  let all = Array.from(sessions.values());
  if (tenantId && appConfig.tenantIsolation) {
    all = all.filter((s) => s.tenantId === tenantId);
  }
  if (userId) all = all.filter((s) => s.userId === userId);
  return all;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
