import type { Role } from "@/data/rbac";

interface RateLimitEntry {
  timestamps: number[];
}

// Per-user limits (requests per minute)
const USER_RATE_LIMITS: Record<Role, number> = {
  admin: 60,
  engineer: 30,
  manager: 20,
  viewer: 30,
  intern: 10,
};

// Per-tool limits (calls per minute)
const TOOL_RATE_LIMITS: Record<string, number> = {
  read_file: 5,
  db_query: 10,
  send_email: 3,
  gist_create: 3,
  slack_dm: 5,
  browse_url: 15,
  write_log: 30,
  get_contacts: 10,
  create_calendar_invite: 5,
  read_repo: 10,
  read_inbox: 10,
  read_slack_channel: 10,
};

const WINDOW_MS = 60_000; // 1 minute

// In-memory stores
const userBuckets = new Map<string, RateLimitEntry>();
const toolBuckets = new Map<string, RateLimitEntry>();

function slidingWindowCheck(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    store.set(key, entry);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterSeconds: 0, remaining: limit - entry.timestamps.length };
}

export function checkUserRateLimit(
  userId: string,
  role: Role
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const limit = USER_RATE_LIMITS[role] ?? 10;
  return slidingWindowCheck(userBuckets, `user:${userId}`, limit);
}

export function checkToolRateLimit(
  userId: string,
  toolName: string
): { allowed: boolean; retryAfterSeconds: number } {
  const limit = TOOL_RATE_LIMITS[toolName] ?? 10;
  const result = slidingWindowCheck(toolBuckets, `tool:${userId}:${toolName}`, limit);
  return { allowed: result.allowed, retryAfterSeconds: result.retryAfterSeconds };
}
