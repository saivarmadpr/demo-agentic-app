import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import { addDocument, getDocumentCount } from "@/lib/rag/vector-store";
import type { VectorDocument } from "@/lib/rag/vector-store";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveUser(request, {});

    if (user.role !== "admin" && user.role !== "engineer") {
      return NextResponse.json(
        { error: "Access denied: admin or engineer role required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, title, source, category, accessLevel } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Request body must include a 'content' string." },
        { status: 400 }
      );
    }

    const metadata: VectorDocument["metadata"] = {
      source: source || "user-upload",
      title: title || "Untitled Document",
      category: category || "general",
      accessLevel: accessLevel || "internal",
    };

    const doc = await addDocument(content, metadata);

    return NextResponse.json({
      id: doc.id,
      title: metadata.title,
      source: metadata.source,
      category: metadata.category,
      accessLevel: metadata.accessLevel,
      contentLength: content.length,
      totalDocuments: getDocumentCount(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
