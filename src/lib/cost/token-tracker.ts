import { appConfig } from "@/data/config";

interface TokenBucket {
  requestTokens: number;
  sessionTokens: Map<string, number>;
  dailyTokens: number;
  dailyResetAt: number;
}

const userBuckets = new Map<string, TokenBucket>();

function getBucket(userId: string): TokenBucket {
  let bucket = userBuckets.get(userId);
  const now = Date.now();
  if (!bucket) {
    bucket = {
      requestTokens: 0,
      sessionTokens: new Map(),
      dailyTokens: 0,
      dailyResetAt: now + 86400000,
    };
    userBuckets.set(userId, bucket);
  }
  if (now > bucket.dailyResetAt) {
    bucket.dailyTokens = 0;
    bucket.dailyResetAt = now + 86400000;
  }
  return bucket;
}

export interface TokenCheckResult {
  allowed: boolean;
  reason?: string;
  usage: {
    requestTokens: number;
    sessionTokens: number;
    dailyTokens: number;
  };
  limits: {
    maxPerRequest: number;
    maxPerSession: number;
    maxPerDay: number;
  };
}

export function checkTokenBudget(
  userId: string,
  sessionId: string,
  estimatedTokens: number,
): TokenCheckResult {
  const bucket = getBucket(userId);
  const sessionUsage = bucket.sessionTokens.get(sessionId) ?? 0;

  const usage = {
    requestTokens: estimatedTokens,
    sessionTokens: sessionUsage,
    dailyTokens: bucket.dailyTokens,
  };
  const limits = {
    maxPerRequest: appConfig.maxTokensPerRequest,
    maxPerSession: appConfig.maxTokensPerSession,
    maxPerDay: appConfig.maxTokensPerUserDaily,
  };

  if (estimatedTokens > appConfig.maxTokensPerRequest) {
    return { allowed: false, reason: `Request would use ~${estimatedTokens} tokens, exceeding per-request limit of ${appConfig.maxTokensPerRequest}`, usage, limits };
  }
  if (sessionUsage + estimatedTokens > appConfig.maxTokensPerSession) {
    return { allowed: false, reason: `Session token usage (${sessionUsage} + ${estimatedTokens}) would exceed limit of ${appConfig.maxTokensPerSession}`, usage, limits };
  }
  if (bucket.dailyTokens + estimatedTokens > appConfig.maxTokensPerUserDaily) {
    return { allowed: false, reason: `Daily token usage (${bucket.dailyTokens} + ${estimatedTokens}) would exceed limit of ${appConfig.maxTokensPerUserDaily}`, usage, limits };
  }
  return { allowed: true, usage, limits };
}

export function recordTokenUsage(
  userId: string,
  sessionId: string,
  tokens: number,
): void {
  const bucket = getBucket(userId);
  bucket.requestTokens = tokens;
  const prev = bucket.sessionTokens.get(sessionId) ?? 0;
  bucket.sessionTokens.set(sessionId, prev + tokens);
  bucket.dailyTokens += tokens;
}

export function getTokenUsage(userId: string, sessionId?: string): {
  daily: number;
  session: number;
} {
  const bucket = getBucket(userId);
  return {
    daily: bucket.dailyTokens,
    session: sessionId ? (bucket.sessionTokens.get(sessionId) ?? 0) : 0,
  };
}
