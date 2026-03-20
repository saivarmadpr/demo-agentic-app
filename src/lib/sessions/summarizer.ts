import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { appConfig } from "@/data/config";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI();
  return openai;
}

export async function maybeSummarize(
  messages: ChatCompletionMessageParam[],
): Promise<ChatCompletionMessageParam[]> {
  const nonSystem = messages.filter((m) => m.role !== "system");
  const systemMsgs = messages.filter((m) => m.role === "system");

  if (nonSystem.length < appConfig.summarizationThreshold) {
    return messages;
  }

  const cutPoint = Math.floor(nonSystem.length * 0.6);
  const toSummarize = nonSystem.slice(0, cutPoint);
  const toKeep = nonSystem.slice(cutPoint);

  try {
    const summaryText = await summarizeMessages(toSummarize);
    return [
      ...systemMsgs,
      {
        role: "system" as const,
        content: `[CONVERSATION SUMMARY — earlier messages condensed]\n${summaryText}`,
      },
      ...toKeep,
    ];
  } catch {
    return [
      ...systemMsgs,
      ...nonSystem.slice(-appConfig.maxSessionHistory),
    ];
  }
}

async function summarizeMessages(
  messages: ChatCompletionMessageParam[],
): Promise<string> {
  const transcript = messages
    .map((m) => {
      const content = typeof m.content === "string" ? m.content : "[complex]";
      return `${m.role}: ${content.slice(0, 500)}`;
    })
    .join("\n");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Summarize this conversation excerpt into a concise paragraph. Preserve all key facts, decisions, data mentioned, and tool results. Do not omit sensitive details.",
      },
      { role: "user", content: transcript },
    ],
    max_tokens: 1000,
    temperature: 0,
  });

  return completion.choices[0]?.message?.content ?? "Summary unavailable.";
}
