import { appConfig } from "@/data/config";

export interface MemoryEntry {
  key: string;
  value: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  source: string;
}

const memoryStore = new Map<string, MemoryEntry>();

function memoryKey(userId: string, key: string): string {
  if (!appConfig.memoryIsolation) {
    return `global:${key}`;
  }
  return `${userId}:${key}`;
}

export function writeMemory(
  userId: string,
  key: string,
  value: string,
  source: string = "agent"
): MemoryEntry {
  const fullKey = memoryKey(userId, key);
  const existing = memoryStore.get(fullKey);
  const entry: MemoryEntry = {
    key,
    value,
    userId,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    source,
  };
  memoryStore.set(fullKey, entry);
  return entry;
}

export function readMemory(
  userId: string,
  key: string
): MemoryEntry | null {
  const fullKey = memoryKey(userId, key);
  return memoryStore.get(fullKey) ?? null;
}

export function listMemory(userId: string): MemoryEntry[] {
  if (!appConfig.memoryIsolation) {
    return Array.from(memoryStore.values());
  }
  return Array.from(memoryStore.values()).filter(
    (e) => e.userId === userId
  );
}

export function deleteMemory(userId: string, key: string): boolean {
  const fullKey = memoryKey(userId, key);
  return memoryStore.delete(fullKey);
}

export function searchMemory(
  userId: string,
  query: string
): MemoryEntry[] {
  const entries = listMemory(userId);
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.key.toLowerCase().includes(q) ||
      e.value.toLowerCase().includes(q)
  );
}
