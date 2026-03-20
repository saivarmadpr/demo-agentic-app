import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { getSpecialist, type SpecialistAgent } from "./specialists";
import { buildSpecialistSystemPrompt } from "./router";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI();
  return openai;
}

const MAX_DELEGATION_DEPTH = 3;
const MAX_INNER_ITERATIONS = 5;

export interface DelegationResult {
  agentId: string;
  response: string;
  depth: number;
  chain: string[];
}

export async function delegateToAgent(
  agentId: string,
  task: string,
  userName: string,
  userRole: string,
  availableTools: ChatCompletionTool[],
  executeToolFn: (name: string, args: Record<string, unknown>) => Promise<string>,
  currentDepth: number = 0,
  chain: string[] = [],
): Promise<DelegationResult> {
  if (currentDepth >= MAX_DELEGATION_DEPTH) {
    return {
      agentId,
      response: `[delegation] Maximum delegation depth (${MAX_DELEGATION_DEPTH}) reached. Cannot delegate further.`,
      depth: currentDepth,
      chain,
    };
  }

  const specialist = getSpecialist(agentId);
  if (!specialist) {
    return {
      agentId,
      response: `[delegation] Unknown agent: ${agentId}. Available: data_analyst, code_assistant, communication, security_ops, research`,
      depth: currentDepth,
      chain,
    };
  }

  const newChain = [...chain, agentId];

  const specialistToolNames = new Set(specialist.allowedTools);
  const tools = availableTools.filter((t) => {
    const fn = t as { type: "function"; function: { name: string } };
    return specialistToolNames.has(fn.function.name);
  });

  const systemPrompt = buildSpecialistSystemPrompt(specialist, userName, userRole) +
    `\nYou were delegated this task by agent "${chain[chain.length - 1] ?? "supervisor"}". Delegation depth: ${currentDepth + 1}/${MAX_DELEGATION_DEPTH}.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: task },
  ];

  for (let i = 0; i < MAX_INNER_ITERATIONS; i++) {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return {
        agentId,
        response: msg.content ?? "",
        depth: currentDepth + 1,
        chain: newChain,
      };
    }

    for (const tc of msg.tool_calls) {
      if (tc.type !== "function") continue;
      let fnArgs: Record<string, unknown>;
      try { fnArgs = JSON.parse(tc.function.arguments); } catch { fnArgs = {}; }

      if (tc.function.name === "delegate_to_agent") {
        const subResult = await delegateToAgent(
          fnArgs.agent_id as string,
          fnArgs.task as string,
          userName,
          userRole,
          availableTools,
          executeToolFn,
          currentDepth + 1,
          newChain,
        );
        messages.push({ role: "tool", tool_call_id: tc.id, content: subResult.response });
      } else {
        const result = await executeToolFn(tc.function.name, fnArgs);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
    }
  }

  return {
    agentId,
    response: "[delegation] Agent reached max iterations.",
    depth: currentDepth + 1,
    chain: newChain,
  };
}
