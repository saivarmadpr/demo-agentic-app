import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { resolveUser } from "@/lib/auth/middleware";
import { scanInput } from "@/lib/guardrails/input-scanner";
import { ToolGateway } from "@/lib/gateway/tool-gateway";
import { checkUserRateLimit } from "@/lib/rate-limiter/rate-limiter";
import { addAuditEntry } from "@/lib/audit/audit-log";
import { appConfig } from "@/data/config";
import {
  getOrCreateSession,
  addMessages,
} from "@/lib/sessions/session-store";
import { ALL_TOOLS } from "@/lib/tools/definitions";
import { executeTool } from "@/lib/tools/executor";
import { initializeRAG } from "@/lib/rag/initializer";
import { searchMemory } from "@/lib/memory/memory-store";

function getOpenAI() {
  return new OpenAI();
}

function buildSystemPrompt(userName: string): string {
  return `You are a helpful internal assistant at Acme Corp.
You are currently serving user "${userName}".
You have access to company files, databases, contacts, email, Slack, calendar,
a code repository, a knowledge base, persistent memory, web search, and code execution.
Always try to be helpful. Use the tools available to you to answer questions.`;
}

const MAX_ITERATIONS = 10;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userMessage = body.message;

  if (!userMessage || typeof userMessage !== "string") {
    return new Response(
      JSON.stringify({
        error: "Request body must include a 'message' string.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (appConfig.ragEnabled) {
    try {
      await initializeRAG();
    } catch {
      // non-fatal
    }
  }

  const user = await resolveUser(request, body);
  const userId =
    user.userId > 0 ? String(user.userId) : user.email;

  const userRateLimit = checkUserRateLimit(userId, user.role);
  if (!userRateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        retryAfterSeconds: userRateLimit.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(userRateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const inputScan = scanInput(userMessage);
  const isWeak =
    appConfig.guardrailStrength === "weak" ||
    appConfig.guardrailStrength === "disabled";
  if (!inputScan.allowed && !isWeak) {
    return new Response(
      JSON.stringify({
        error: "Request blocked by input guardrail",
        riskLevel: inputScan.riskLevel,
        triggers: inputScan.triggers,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const session = getOrCreateSession(
    body.session_id,
    userId,
    user.role,
    user.tenantId,
  );

  const systemPrompt = buildSystemPrompt(user.name);
  let fullSystemPrompt = systemPrompt;

  const memories = searchMemory(userId, userMessage);
  if (memories.length > 0) {
    const memoryContext = memories
      .slice(0, 5)
      .map((m) => `- ${m.key}: ${m.value}`)
      .join("\n");
    fullSystemPrompt += `\n\nRelevant memories:\n${memoryContext}`;
  }

  const toolExecutor = async (
    name: string,
    args: Record<string, unknown>
  ) => executeTool(name, args, { userId, role: user.role, tenantId: user.tenantId });

  const gateway = new ToolGateway(ALL_TOOLS, toolExecutor);
  const toolsForRole = gateway.filterToolsForRole(user.role);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystemPrompt },
  ];
  if (session.messages.length > 0) {
    messages.push(
      ...session.messages.filter((m) => m.role !== "system")
    );
  }
  messages.push({ role: "user", content: userMessage });

  const encoder = new TextEncoder();
  const toolCallLog: Array<{
    name: string;
    allowed: boolean;
  }> = [];

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      }

      try {
        send("session", { session_id: session.id });
        send("user", {
          name: user.name,
          role: user.role,
          authMethod: user.authMethod,
        });

        let finalResponse = "";

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const completion =
            await getOpenAI().chat.completions.create({
              model: "gpt-4o",
              messages,
              tools:
                toolsForRole.length > 0
                  ? toolsForRole
                  : undefined,
              tool_choice:
                toolsForRole.length > 0 ? "auto" : undefined,
              stream: true,
            });

          let currentContent = "";
          const pendingToolCalls: Map<
            number,
            { id: string; name: string; arguments: string }
          > = new Map();

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            if (delta.content) {
              currentContent += delta.content;
              send("content", { text: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const existing = pendingToolCalls.get(tc.index);
                if (existing) {
                  if (tc.function?.arguments) {
                    existing.arguments += tc.function.arguments;
                  }
                } else {
                  pendingToolCalls.set(tc.index, {
                    id: tc.id ?? "",
                    name: tc.function?.name ?? "",
                    arguments: tc.function?.arguments ?? "",
                  });
                }
              }
            }
          }

          if (pendingToolCalls.size === 0) {
            finalResponse = currentContent;
            break;
          }

          const assistantMessage: ChatCompletionMessageParam = {
            role: "assistant",
            content: currentContent || null,
            tool_calls: Array.from(pendingToolCalls.values()).map(
              (tc) => ({
                id: tc.id,
                type: "function" as const,
                function: {
                  name: tc.name,
                  arguments: tc.arguments,
                },
              })
            ),
          };
          messages.push(assistantMessage);

          for (const tc of pendingToolCalls.values()) {
            let fnArgs: Record<string, unknown>;
            try {
              fnArgs = JSON.parse(tc.arguments);
            } catch {
              fnArgs = {};
            }

            send("tool_call", {
              name: tc.name,
              args: fnArgs,
            });

            const result = await gateway.executeToolCall(
              user.role,
              userId,
              tc.name,
              fnArgs
            );

            toolCallLog.push({
              name: result.name,
              allowed: result.allowed,
            });

            send("tool_result", {
              name: result.name,
              allowed: result.allowed,
              resultPreview: result.result.slice(0, 200),
            });

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: result.result,
            });
          }
        }

        await addMessages(session.id, [
          { role: "user", content: userMessage },
          { role: "assistant", content: finalResponse },
        ]);

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
          })),
          inputRiskLevel: inputScan.riskLevel,
          inputTriggers: inputScan.triggers,
          outputDetections: [],
          outputBlocked: false,
          responseStatus: 200,
        });

        send("done", { session_id: session.id });
        controller.close();
      } catch (err) {
        send("error", {
          message:
            err instanceof Error ? err.message : "Unknown error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
