import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import { storeFile, listUploadedFiles } from "@/lib/files/file-store";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const user = await resolveUser(request, {});

    if (user.role === "intern") {
      return NextResponse.json(
        { error: "Access denied: interns cannot upload files" },
        { status: 403 }
      );
    }

    const contentType =
      request.headers.get("content-type") || "";

    let fileName: string;
    let mimeType: string;
    let content: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No file provided in form data" },
          { status: 400 }
        );
      }

      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      const buffer = await file.arrayBuffer();

      if (buffer.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 413 }
        );
      }

      content = new TextDecoder().decode(buffer);
    } else {
      const body = await request.json();
      fileName = body.filename || "untitled.txt";
      mimeType = body.mime_type || "text/plain";
      content = body.content;

      if (!content) {
        return NextResponse.json(
          { error: "No content provided" },
          { status: 400 }
        );
      }
    }

    const userId =
      user.userId > 0 ? String(user.userId) : user.email;
    const stored = storeFile(fileName, mimeType, content, userId);

    return NextResponse.json({
      file_id: stored.id,
      original_name: stored.originalName,
      mime_type: stored.mimeType,
      size: stored.size,
      uploaded_at: new Date(stored.uploadedAt).toISOString(),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await resolveUser(request, {});
    const userId =
      user.userId > 0 ? String(user.userId) : user.email;

    const files =
      user.role === "admin"
        ? listUploadedFiles()
        : listUploadedFiles(userId);

    return NextResponse.json({
      count: files.length,
      files: files.map((f) => ({
        file_id: f.id,
        original_name: f.originalName,
        mime_type: f.mimeType,
        size: f.size,
        uploaded_at: new Date(f.uploadedAt).toISOString(),
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
