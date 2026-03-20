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
    maxSessionHistory: parseInt(
      process.env.MAX_SESSION_HISTORY || "50",
      10
    ),
    ragEnabled: process.env.RAG_ENABLED !== "false",
    multiAgentEnabled: process.env.MULTI_AGENT_ENABLED !== "false",
    codeExecutionEnabled: process.env.CODE_EXECUTION_ENABLED !== "false",
    webhooksEnabled: process.env.WEBHOOKS_ENABLED !== "false",
    fileUploadEnabled: process.env.FILE_UPLOAD_ENABLED !== "false",
    streamingEnabled: process.env.STREAMING_ENABLED !== "false",
  };
}

export const appConfig = loadConfig();
