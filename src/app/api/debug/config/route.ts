import { NextResponse } from "next/server";
import { appConfig } from "@/data/config";
import { getDocumentCount } from "@/lib/rag/vector-store";

export async function GET() {
  return NextResponse.json({
    appConfig,
    ragDocuments: getDocumentCount(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      GUARDRAIL_STRENGTH: process.env.GUARDRAIL_STRENGTH || "moderate",
      RBAC_ENFORCEMENT: process.env.RBAC_ENFORCEMENT || "strict",
      SESSION_ISOLATION: process.env.SESSION_ISOLATION ?? "true",
      MEMORY_ISOLATION: process.env.MEMORY_ISOLATION ?? "true",
      RAG_ENABLED: process.env.RAG_ENABLED ?? "true",
      MULTI_AGENT_ENABLED: process.env.MULTI_AGENT_ENABLED ?? "true",
      TENANT_ISOLATION: process.env.TENANT_ISOLATION ?? "true",
      APPROVAL_REQUIRED: process.env.APPROVAL_REQUIRED ?? "true",
      OUTPUT_SANITIZATION: process.env.OUTPUT_SANITIZATION ?? "true",
      CONTENT_MODERATION: process.env.CONTENT_MODERATION ?? "moderate",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
        ? `${process.env.OPENAI_API_KEY.slice(0, 8)}...${process.env.OPENAI_API_KEY.slice(-4)}`
        : "not set",
      JWT_SECRET: "demo-agentic-app-jwt-secret-key-change-in-prod",
    },
    endpoints: [
      { method: "POST", path: "/api/auth/login", description: "Get JWT token" },
      { method: "POST", path: "/api/agent", description: "Main agent endpoint (multi-agent, sessions, RAG, memory, moderation, tokens)" },
      { method: "POST", path: "/api/agent/stream", description: "Streaming agent endpoint (SSE)" },
      { method: "POST", path: "/api/exfil-test-agent", description: "Legacy agent endpoint" },
      { method: "GET", path: "/api/audit-logs", description: "View audit logs (admin only)" },
      { method: "GET", path: "/api/sessions", description: "List/view sessions" },
      { method: "POST", path: "/api/documents/ingest", description: "Ingest documents into RAG" },
      { method: "POST", path: "/api/files/upload", description: "Upload files" },
      { method: "POST/GET", path: "/api/webhooks/receive", description: "Webhook receiver" },
      { method: "GET/POST", path: "/api/approvals", description: "Approval workflow (list, approve, reject)" },
      { method: "POST", path: "/api/render", description: "Render agent output as HTML" },
      { method: "GET/POST/DELETE", path: "/api/privacy", description: "Privacy/consent management (GDPR)" },
      { method: "GET", path: "/api/debug/config", description: "This endpoint" },
    ],
  });
}
