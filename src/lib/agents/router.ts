import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SPECIALIST_AGENTS, type SpecialistAgent } from "./specialists";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI();
  return openai;
}

export interface RoutingDecision {
  agentId: string;
  confidence: number;
  reasoning: string;
}

const ROUTER_SYSTEM_PROMPT = `You are the Supervisor agent at Acme Corp. Your job is to route user requests to the most appropriate specialist agent.

Available specialist agents:
${Object.values(SPECIALIST_AGENTS)
  .map((a) => `- ${a.id}: ${a.description}`)
  .join("\n")}

Analyze the user's request and decide which specialist should handle it.
If the request spans multiple domains, pick the PRIMARY one.
If you're unsure, route to research.

Respond with EXACTLY this JSON format (no markdown, no extra text):
{"agentId": "<agent_id>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

export async function routeRequest(
  userMessage: string,
  conversationHistory: ChatCompletionMessageParam[] = []
): Promise<RoutingDecision> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: ROUTER_SYSTEM_PROMPT },
  ];

  const recentHistory = conversationHistory
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-4);
  messages.push(...recentHistory);
  messages.push({ role: "user", content: userMessage });

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);

    if (parsed.agentId && SPECIALIST_AGENTS[parsed.agentId]) {
      return {
        agentId: parsed.agentId,
        confidence: parsed.confidence ?? 0.5,
        reasoning: parsed.reasoning ?? "Routed by supervisor",
      };
    }
  } catch {
    // Fallback routing based on keywords
  }

  return keywordBasedRouting(userMessage);
}

function keywordBasedRouting(message: string): RoutingDecision {
  const lower = message.toLowerCase();

  const patterns: Array<{
    keywords: string[];
    agentId: string;
  }> = [
    {
      keywords: [
        "sql",
        "query",
        "database",
        "db",
        "analytics",
        "data",
        "report",
        "statistics",
        "count",
        "average",
        "sum",
      ],
      agentId: "data_analyst",
    },
    {
      keywords: [
        "code",
        "function",
        "bug",
        "debug",
        "repo",
        "repository",
        "git",
        "gist",
        "program",
        "script",
        "execute",
        "run",
      ],
      agentId: "code_assistant",
    },
    {
      keywords: [
        "email",
        "send",
        "slack",
        "message",
        "calendar",
        "invite",
        "meeting",
        "contact",
        "inbox",
        "dm",
      ],
      agentId: "communication",
    },
    {
      keywords: [
        "security",
        "access",
        "log",
        "audit",
        "vulnerability",
        "incident",
        "breach",
        "firewall",
        "permission",
      ],
      agentId: "security_ops",
    },
    {
      keywords: [
        "search",
        "find",
        "research",
        "look up",
        "browse",
        "web",
        "information",
        "document",
      ],
      agentId: "research",
    },
    {
      keywords: [
        "invoice",
        "payment",
        "transfer",
        "billing",
        "finance",
        "financial",
        "revenue",
        "account",
        "transaction",
        "refund",
      ],
      agentId: "finance",
    },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      return {
        agentId: pattern.agentId,
        confidence: 0.6,
        reasoning: `Keyword match for ${pattern.agentId}`,
      };
    }
  }

  return {
    agentId: "research",
    confidence: 0.3,
    reasoning: "Default routing — no strong signal detected",
  };
}

export function buildSpecialistSystemPrompt(
  agent: SpecialistAgent,
  userName: string,
  userRole: string
): string {
  return `${agent.systemPrompt}

You are currently serving user "${userName}" (role: ${userRole}).
You were selected by the Supervisor agent to handle this request.
Use the tools available to you to provide a thorough response.`;
}
