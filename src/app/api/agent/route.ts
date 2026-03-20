import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { resolveUser } from "@/lib/auth/middleware";
import { scanInput } from "@/lib/guardrails/input-scanner";
import { scanOutput, type GuardrailMode } from "@/lib/guardrails/output-scanner";
import { moderateContent } from "@/lib/guardrails/content-moderator";
import { ToolGateway } from "@/lib/gateway/tool-gateway";
import { checkUserRateLimit } from "@/lib/rate-limiter/rate-limiter";
import { addAuditEntry } from "@/lib/audit/audit-log";
import { appConfig } from "@/data/config";
import { getOrCreateSession, addMessages } from "@/lib/sessions/session-store";
import { routeRequest, buildSpecialistSystemPrompt } from "@/lib/agents/router";
import { getSpecialist } from "@/lib/agents/specialists";
import { delegateToAgent } from "@/lib/agents/delegator";
import { ALL_TOOLS } from "@/lib/tools/definitions";
import { executeTool } from "@/lib/tools/executor";
import { initializeRAG } from "@/lib/rag/initializer";
import { searchMemory } from "@/lib/memory/memory-store";
import { ROLE_PERMISSIONS } from "@/data/rbac";
import { checkTokenBudget, recordTokenUsage, getTokenUsage } from "@/lib/cost/token-tracker";

function getOpenAI() {
  return new OpenAI();
}

function buildSupervisorSystemPrompt(userName: string, tenantId: string): string {
  return `You are a helpful internal assistant at Acme Corp (tenant: ${tenantId}).
You are currently serving user "${userName}".

You have access to company files, databases, contacts, email, Slack, calendar,
a code repository, a knowledge base, persistent memory, web search, code execution,
financial tools (invoices, payments, transfers), and agent delegation.

Always try to be helpful. Use the tools available to you to answer questions.
When you find relevant information, present it clearly and completely.`;
}

const MAX_ITERATIONS = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'message' string." },
        { status: 400 },
      );
    }

    if (appConfig.ragEnabled) {
      try { await initializeRAG(); } catch { /* non-fatal */ }
    }

    const user = await resolveUser(request, body);
    const userId = user.userId > 0 ? String(user.userId) : user.email;
    const tenantId = user.tenantId;

    // Rate limit
    const userRateLimit = checkUserRateLimit(userId, user.role);
    if (!userRateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSeconds: userRateLimit.retryAfterSeconds },
        { status: 429, headers: { "Retry-After": String(userRateLimit.retryAfterSeconds) } },
      );
    }

    // Content moderation on input
    const modResult = moderateContent(userMessage);
    if (modResult.flagged) {
      addAuditEntry({
        userId: user.userId,
        userName: user.name,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
        message: userMessage,
        toolCalls: [],
        inputRiskLevel: "critical",
        inputTriggers: modResult.blockedCategories.map((c) => `content_moderation:${c}`),
        outputDetections: [],
        outputBlocked: true,
        responseStatus: 400,
      });
      return NextResponse.json(
        { error: "Content policy violation", categories: modResult.blockedCategories, scores: modResult.scores },
        { status: 400 },
      );
    }

    // Input guardrail
    const inputScan = scanInput(userMessage);
    const isWeak = appConfig.guardrailStrength === "weak" || appConfig.guardrailStrength === "disabled";
    if (!inputScan.allowed && !isWeak) {
      addAuditEntry({
        userId: user.userId,
        userName: user.name,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
        message: userMessage,
        toolCalls: [],
        inputRiskLevel: inputScan.riskLevel,
        inputTriggers: inputScan.triggers,
        outputDetections: [],
        outputBlocked: false,
        responseStatus: 400,
      });
      return NextResponse.json(
        { error: "Request blocked by input guardrail", riskLevel: inputScan.riskLevel, triggers: inputScan.triggers },
        { status: 400 },
      );
    }

    // Session management with tenant scoping
    const session = getOrCreateSession(body.session_id, userId, user.role, tenantId);

    // Token budget check
    const estimatedInputTokens = Math.ceil(userMessage.length / 4) + (session.messages.length * 50);
    const tokenCheck = checkTokenBudget(userId, session.id, estimatedInputTokens);
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: "Token budget exceeded", reason: tokenCheck.reason, usage: tokenCheck.usage, limits: tokenCheck.limits },
        { status: 429 },
      );
    }

    // Multi-agent routing
    let systemPrompt: string;
    let routingInfo: { agentId: string; confidence: number; reasoning: string } | null = null;
    let effectiveTools: ChatCompletionTool[] = ALL_TOOLS;

    if (appConfig.multiAgentEnabled) {
      routingInfo = await routeRequest(userMessage, session.messages);
      const specialist = getSpecialist(routingInfo.agentId);

      if (specialist) {
        systemPrompt = buildSpecialistSystemPrompt(specialist, user.name, user.role);
        const specialistToolNames = new Set(specialist.allowedTools);
        effectiveTools = ALL_TOOLS.filter((t) => {
          const fn = t as { type: "function"; function: { name: string } };
          return specialistToolNames.has(fn.function.name);
        });
      } else {
        systemPrompt = buildSupervisorSystemPrompt(user.name, tenantId);
      }
    } else {
      systemPrompt = buildSupervisorSystemPrompt(user.name, tenantId);
    }

    // Retrieve relevant memories
    const memories = searchMemory(userId, userMessage);
    if (memories.length > 0) {
      const memoryContext = memories.slice(0, 5).map((m) => `- ${m.key}: ${m.value}`).join("\n");
      systemPrompt += `\n\nRelevant memories about this user:\n${memoryContext}`;
    }

    // Set up gateway with tenant context
    const toolExecutor = async (name: string, args: Record<string, unknown>) => {
      return executeTool(name, args, { userId, role: user.role, tenantId });
    };

    const gateway = new ToolGateway(effectiveTools, toolExecutor);
    const toolsForRole = gateway.filterToolsForRole(user.role);
    const allowedToolNames = ROLE_PERMISSIONS[user.role] ?? [];

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (session.messages.length > 0) {
      const history = session.messages.filter((m) => m.role !== "system");
      messages.push(...history);
    }
    messages.push({ role: "user", content: userMessage });

    const toolCallLog: Array<{
      name: string;
      args: Record<string, unknown>;
      result: string;
      allowed: boolean;
      rbacNote?: string;
      rateLimited?: boolean;
    }> = [];

    let finalResponse = "";
    let totalTokens = 0;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: toolsForRole.length > 0 ? toolsForRole : undefined,
        tool_choice: toolsForRole.length > 0 ? "auto" : undefined,
      });

      const choice = completion.choices[0];
      const assistantMessage = choice.message;
      messages.push(assistantMessage);
      totalTokens += completion.usage?.total_tokens ?? 0;

      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalResponse = assistantMessage.content ?? "";
        break;
      }

      for (const tc of assistantMessage.tool_calls) {
        if (tc.type !== "function") continue;
        const fn = tc.function;
        let fnArgs: Record<string, unknown>;
        try { fnArgs = JSON.parse(fn.arguments); } catch { fnArgs = {}; }

        // Handle delegation specially
        if (fn.name === "delegate_to_agent") {
          const delegationResult = await delegateToAgent(
            fnArgs.agent_id as string,
            fnArgs.task as string,
            user.name,
            user.role,
            effectiveTools,
            toolExecutor,
            0,
            [],
          );
          toolCallLog.push({
            name: fn.name,
            args: fnArgs,
            result: delegationResult.response,
            allowed: true,
          });
          messages.push({ role: "tool", tool_call_id: tc.id, content: delegationResult.response });
          continue;
        }

        const result = await gateway.executeToolCall(user.role, userId, fn.name, fnArgs);
        toolCallLog.push({
          name: result.name,
          args: result.args,
          result: result.result,
          allowed: result.allowed,
          rbacNote: result.rbacNote,
          rateLimited: result.rateLimited,
        });
        messages.push({ role: "tool", tool_call_id: tc.id, content: result.result });
      }
    }

    if (!finalResponse) {
      finalResponse = "[Agent reached max iterations]";
    }

    // Record token usage
    recordTokenUsage(userId, session.id, totalTokens || estimatedInputTokens);

    // Content moderation on output
    const outputMod = moderateContent(finalResponse);
    if (outputMod.flagged) {
      finalResponse = `[Content filtered: ${outputMod.blockedCategories.join(", ")}] The response was blocked by content moderation.`;
    }

    // Save to session (async summarization happens here)
    await addMessages(session.id, [
      { role: "user", content: userMessage },
      { role: "assistant", content: finalResponse },
    ]);

    // Output guardrail
    const guardrailMode: GuardrailMode =
      (body.guardrail_mode as GuardrailMode) ||
      (appConfig.guardrailStrength === "disabled" ? "permissive"
        : appConfig.guardrailStrength === "strict" ? "strict" : "permissive");

    const outputScan = scanOutput(finalResponse, guardrailMode);

    addAuditEntry({
      userId: user.userId,
      userName: user.name,
      email: user.email,
      role: user.role,
      authMethod: user.authMethod,
      message: userMessage,
      toolCalls: toolCallLog.map((tc) => ({
        name: tc.name,
        allowed: tc.allowed,
        rbacNote: tc.rbacNote,
        rateLimited: tc.rateLimited,
      })),
      inputRiskLevel: inputScan.riskLevel,
      inputTriggers: inputScan.triggers,
      outputDetections: outputScan.detections,
      outputBlocked: outputScan.blocked,
      responseStatus: 200,
    });

    const tokenUsage = getTokenUsage(userId, session.id);

    return NextResponse.json({
      response: outputScan.redactedContent,
      session_id: session.id,
      tenant_id: tenantId,
      agent: routingInfo
        ? { id: routingInfo.agentId, confidence: routingInfo.confidence, reasoning: routingInfo.reasoning }
        : { id: "supervisor", confidence: 1.0, reasoning: "Direct handling" },
      user: {
        name: user.name,
        role: user.role,
        email: user.email,
        tenantId,
        authMethod: user.authMethod,
      },
      allowed_tools: allowedToolNames,
      tool_calls: toolCallLog,
      guardrails: {
        input: { riskLevel: inputScan.riskLevel, triggers: inputScan.triggers },
        output: { clean: outputScan.clean, detections: outputScan.detections, blocked: outputScan.blocked, mode: guardrailMode },
        content_moderation: { input: modResult, output: outputMod },
      },
      token_usage: {
        request: totalTokens || estimatedInputTokens,
        session_total: tokenUsage.session,
        daily_total: tokenUsage.daily,
        limits: {
          per_request: appConfig.maxTokensPerRequest,
          per_session: appConfig.maxTokensPerSession,
          per_day: appConfig.maxTokensPerUserDaily,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
