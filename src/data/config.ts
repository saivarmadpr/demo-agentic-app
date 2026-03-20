export interface AppConfig {
  guardrailStrength: "strict" | "moderate" | "weak" | "disabled";
  rbacEnforcement: "strict" | "permissive" | "disabled";
  sessionIsolation: boolean;
  memoryIsolation: boolean;
  maxSessionHistory: number;
  ragEnabled: boolean;
  multiAgentEnabled: boolean;
  codeExecutionEnabled: boolean;
  webhooksEnabled: boolean;
  fileUploadEnabled: boolean;
  streamingEnabled: boolean;
  tenantIsolation: boolean;
  approvalRequired: boolean;
  outputSanitization: boolean;
  contentModeration: "strict" | "moderate" | "disabled";
  maxTokensPerRequest: number;
  maxTokensPerSession: number;
  maxTokensPerUserDaily: number;
  summarizationThreshold: number;
}

function loadConfig(): AppConfig {
  return {
    guardrailStrength:
      (process.env.GUARDRAIL_STRENGTH as AppConfig["guardrailStrength"]) ||
      "moderate",
    rbacEnforcement:
      (process.env.RBAC_ENFORCEMENT as AppConfig["rbacEnforcement"]) ||
      "strict",
    sessionIsolation: process.env.SESSION_ISOLATION !== "false",
    memoryIsolation: process.env.MEMORY_ISOLATION !== "false",
    maxSessionHistory: parseInt(process.env.MAX_SESSION_HISTORY || "50", 10),
    ragEnabled: process.env.RAG_ENABLED !== "false",
    multiAgentEnabled: process.env.MULTI_AGENT_ENABLED !== "false",
    codeExecutionEnabled: process.env.CODE_EXECUTION_ENABLED !== "false",
    webhooksEnabled: process.env.WEBHOOKS_ENABLED !== "false",
    fileUploadEnabled: process.env.FILE_UPLOAD_ENABLED !== "false",
    streamingEnabled: process.env.STREAMING_ENABLED !== "false",
    tenantIsolation: process.env.TENANT_ISOLATION !== "false",
    approvalRequired: process.env.APPROVAL_REQUIRED !== "false",
    outputSanitization: process.env.OUTPUT_SANITIZATION !== "false",
    contentModeration:
      (process.env.CONTENT_MODERATION as AppConfig["contentModeration"]) ||
      "moderate",
    maxTokensPerRequest: parseInt(
      process.env.MAX_TOKENS_PER_REQUEST || "16000",
      10,
    ),
    maxTokensPerSession: parseInt(
      process.env.MAX_TOKENS_PER_SESSION || "100000",
      10,
    ),
    maxTokensPerUserDaily: parseInt(
      process.env.MAX_TOKENS_PER_USER_DAILY || "500000",
      10,
    ),
    summarizationThreshold: parseInt(
      process.env.SUMMARIZATION_THRESHOLD || "20",
      10,
    ),
  };
}

export const appConfig = loadConfig();
