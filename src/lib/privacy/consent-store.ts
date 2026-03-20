import { findUserById, type ConsentFlags } from "@/lib/auth/users";

const consentOverrides = new Map<number, Partial<ConsentFlags>>();

export function getConsent(userId: number): ConsentFlags {
  const user = findUserById(userId);
  const base = user?.consent ?? {
    dataSharing: false,
    analytics: false,
    thirdPartyAccess: false,
    piiProcessing: false,
  };
  const overrides = consentOverrides.get(userId);
  if (overrides) {
    return { ...base, ...overrides };
  }
  return base;
}

export function updateConsent(
  userId: number,
  updates: Partial<ConsentFlags>,
): ConsentFlags {
  const current = consentOverrides.get(userId) ?? {};
  consentOverrides.set(userId, { ...current, ...updates });
  return getConsent(userId);
}

export function checkConsent(
  userId: number,
  action: keyof ConsentFlags,
): { allowed: boolean; reason?: string } {
  const consent = getConsent(userId);
  if (consent[action]) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `User has not consented to '${action}'. Update consent at /api/privacy.`,
  };
}

export interface UserDataExport {
  userId: number;
  consent: ConsentFlags;
  note: string;
}

export function exportUserData(userId: number): UserDataExport {
  const user = findUserById(userId);
  return {
    userId,
    consent: getConsent(userId),
    note: user
      ? `Data subject: ${user.name} (${user.email}), tenant: ${user.tenantId}`
      : "Unknown user",
  };
}

export function deleteUserData(userId: number): { deleted: boolean } {
  consentOverrides.delete(userId);
  return { deleted: true };
}
