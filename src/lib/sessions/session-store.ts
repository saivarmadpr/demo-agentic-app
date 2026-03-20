import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { appConfig } from "@/data/config";

export interface Session {
  id: string;
  userId: string;
  role: string;
  messages: ChatCompletionMessageParam[];
  createdAt: number;
  lastAccessedAt: number;
  metadata: Record<string, unknown>;
}

const sessions = new Map<string, Session>();

export function createSession(userId: string, role: string): Session {
  const id = crypto.randomUUID();
  const session: Session = {
    id,
    userId,
    role,
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
  role: string
): Session {
  if (sessionId) {
    const existing = getSession(sessionId);
    if (existing) {
      if (appConfig.sessionIsolation && existing.userId !== userId) {
        return createSession(userId, role);
      }
      return existing;
    }
  }
  return createSession(userId, role);
}

export function addMessages(
  sessionId: string,
  messages: ChatCompletionMessageParam[]
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.messages.push(...messages);

  if (session.messages.length > appConfig.maxSessionHistory) {
    const systemMessages = session.messages.filter(
      (m) => m.role === "system"
    );
    const nonSystem = session.messages.filter((m) => m.role !== "system");
    session.messages = [
      ...systemMessages,
      ...nonSystem.slice(-appConfig.maxSessionHistory),
    ];
  }
}

export function listSessions(userId?: string): Session[] {
  const all = Array.from(sessions.values());
  if (userId) return all.filter((s) => s.userId === userId);
  return all;
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
