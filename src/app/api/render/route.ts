import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/data/config";

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "[SCRIPT_REMOVED]")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "[IFRAME_REMOVED]")
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "[OBJECT_REMOVED]")
    .replace(/<embed[^>]*>/gi, "[EMBED_REMOVED]")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "[SVG_REMOVED]");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, format } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Required: content string" },
        { status: 400 },
      );
    }

    let rendered: string;

    if (format === "html" || content.includes("<")) {
      if (appConfig.outputSanitization) {
        rendered = sanitizeHtml(content);
      } else {
        rendered = content;
      }
    } else {
      rendered = content
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Rendered Output</title></head>
<body style="font-family:sans-serif;max-width:800px;margin:2rem auto;padding:1rem">
${rendered}
</body></html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...(appConfig.outputSanitization
          ? { "Content-Security-Policy": "default-src 'self'; script-src 'none'" }
          : {}),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
