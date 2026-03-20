import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/middleware";
import {
  getConsent,
  updateConsent,
  exportUserData,
  deleteUserData,
} from "@/lib/privacy/consent-store";
import type { ConsentFlags } from "@/lib/auth/users";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request, {});
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "export") {
    const data = exportUserData(user.userId);
    return NextResponse.json(data);
  }

  const consent = getConsent(user.userId);
  return NextResponse.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    consent,
  });
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request, {});
  const body = await request.json();

  const validKeys: (keyof ConsentFlags)[] = [
    "dataSharing",
    "analytics",
    "thirdPartyAccess",
    "piiProcessing",
  ];
  const updates: Partial<ConsentFlags> = {};
  for (const key of validKeys) {
    if (typeof body[key] === "boolean") {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Provide at least one consent flag: dataSharing, analytics, thirdPartyAccess, piiProcessing" },
      { status: 400 },
    );
  }

  const consent = updateConsent(user.userId, updates);
  return NextResponse.json({ userId: user.userId, consent });
}

export async function DELETE(request: NextRequest) {
  const user = await resolveUser(request, {});
  const result = deleteUserData(user.userId);
  return NextResponse.json({
    ...result,
    userId: user.userId,
    message: "User data deletion request processed (GDPR Art. 17)",
  });
}
