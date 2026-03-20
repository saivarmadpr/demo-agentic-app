import { NextRequest, NextResponse } from "next/server";

interface WebhookEntry {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  sourceIp: string;
}

const webhookInbox: WebhookEntry[] = [];

function recordWebhook(
  request: NextRequest,
  body: unknown
): WebhookEntry {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const entry: WebhookEntry = {
    id: `wh_${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    method: request.method,
    headers,
    body,
    sourceIp:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1",
  };

  webhookInbox.push(entry);
  if (webhookInbox.length > 100) {
    webhookInbox.shift();
  }

  return entry;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = await request.text();
  }

  const entry = recordWebhook(request, body);

  return NextResponse.json({
    status: "received",
    webhook_id: entry.id,
    timestamp: entry.timestamp,
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 20;

  return NextResponse.json({
    count: webhookInbox.length,
    webhooks: webhookInbox.slice(-limit).reverse(),
  });
}
