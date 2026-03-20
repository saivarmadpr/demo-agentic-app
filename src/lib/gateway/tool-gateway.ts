import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { Role } from "@/data/rbac";
import { ROLE_PERMISSIONS, canUseTool, checkDataRestriction } from "@/data/rbac";
import { checkToolRateLimit } from "@/lib/rate-limiter/rate-limiter";
import { appConfig } from "@/data/config";

export interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
  result: string;
  allowed: boolean;
  rbacNote?: string;
  rateLimited?: boolean;
}

type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => string | Promise<string>;

export class ToolGateway {
  private allTools: ChatCompletionTool[];
  private executeTool: ToolExecutor;

  constructor(allTools: ChatCompletionTool[], executeTool: ToolExecutor) {
    this.allTools = allTools;
    this.executeTool = executeTool;
  }

  filterToolsForRole(role: Role): ChatCompletionTool[] {
    if (appConfig.rbacEnforcement === "disabled") {
      return this.allTools;
    }
    const allowed = ROLE_PERMISSIONS[role] ?? [];
    return this.allTools.filter((t) => {
      const fn = t as { type: "function"; function: { name: string } };
      return allowed.includes(fn.function.name);
    });
  }

  async executeToolCall(
    role: Role,
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallResult> {
    if (appConfig.rbacEnforcement !== "disabled" && !canUseTool(role, toolName)) {
      if (appConfig.rbacEnforcement === "permissive") {
        console.warn(`[RBAC-PERMISSIVE] Role '${role}' accessing '${toolName}' — would be denied in strict mode`);
      } else {
        return {
          name: toolName,
          args,
          result: `[RBAC] Access denied: your role '${role}' does not have permission to use '${toolName}'. Contact your admin to request access.`,
          allowed: false,
          rbacNote: `Tool '${toolName}' is not permitted for role '${role}'`,
        };
      }
    }

    const rateLimitResult = checkToolRateLimit(userId, toolName);
    if (!rateLimitResult.allowed) {
      return {
        name: toolName,
        args,
        result: `[RATE_LIMIT] Tool '${toolName}' rate limit exceeded. Try again in ${rateLimitResult.retryAfterSeconds}s.`,
        allowed: false,
        rateLimited: true,
        rbacNote: `Tool rate limit exceeded for '${toolName}'`,
      };
    }

    if (appConfig.rbacEnforcement === "strict") {
      const dataBlock = checkDataRestriction(role, toolName, args);
      if (dataBlock) {
        return { name: toolName, args, result: dataBlock, allowed: false, rbacNote: dataBlock };
      }
    }

    let result = await this.executeTool(toolName, args);

    if (role !== "admin" && appConfig.rbacEnforcement !== "disabled") {
      result = filterSensitiveData(result, role);
    }

    return { name: toolName, args, result, allowed: true };
  }
}

function filterSensitiveData(data: string, role: Role): string {
  let filtered = data;
  if (role !== "admin") {
    filtered = filtered.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
    filtered = filtered.replace(/\$2b\$12\$FAKE_HASH_\w+/g, "[HASH_REDACTED]");
    filtered = filtered.replace(/\$2[aby]\$\d{2}\$[A-Za-z0-9./]{50,}/g, "[HASH_REDACTED]");
  }
  return filtered;
}
