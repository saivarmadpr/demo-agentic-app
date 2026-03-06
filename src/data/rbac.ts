// ──────────────────────────────────────────────
// RBAC: Roles, permissions, and fake user sessions
// ──────────────────────────────────────────────

export type Role = "admin" | "engineer" | "manager" | "viewer" | "intern";

// Which tools each role can use
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "read_file", "browse_url", "db_query", "write_log",
    "get_contacts", "create_calendar_invite", "read_repo",
    "gist_create", "send_email", "slack_dm",
    "read_inbox", "read_slack_channel",
  ],
  engineer: [
    "read_repo", "browse_url", "db_query", "write_log",
    "get_contacts", "create_calendar_invite", "slack_dm",
    "read_inbox", "read_slack_channel",
  ],
  manager: [
    "get_contacts", "create_calendar_invite", "send_email",
    "slack_dm", "browse_url", "write_log",
    "read_inbox", "read_slack_channel",
  ],
  viewer: [
    "browse_url", "get_contacts", "write_log",
    "read_slack_channel",
  ],
  intern: [
    "browse_url", "write_log",
  ],
};

// Data-level restrictions: some tools have per-role data scoping
export const DATA_RESTRICTIONS: Record<Role, Record<string, string[]>> = {
  admin: {}, // no restrictions
  engineer: {
    db_query: ["access_logs"], // can only query access_logs, not user_db
    read_file: ["general"],   // cannot read .env or secrets
  },
  manager: {
    db_query: ["access_logs"],
  },
  viewer: {},
  intern: {},
};

// Fake user sessions (API key → user info)
export const FAKE_API_KEYS: Record<string, { userId: number; name: string; email: string; role: Role }> = {
  "ak_admin_001":    { userId: 1, name: "John Doe",    email: "john.doe@acme.com",    role: "admin" },
  "ak_engineer_002": { userId: 2, name: "Jane Smith",  email: "jane.smith@acme.com",  role: "engineer" },
  "ak_manager_003":  { userId: 3, name: "Bob Wilson",  email: "bob.wilson@acme.com",  role: "manager" },
  "ak_viewer_004":   { userId: 4, name: "Alice Chen",  email: "alice.chen@acme.com",  role: "viewer" },
  "ak_intern_005":   { userId: 5, name: "Eve Taylor",  email: "eve.taylor@acme.com",  role: "intern" },
};

export const VALID_ROLES: Role[] = ["admin", "engineer", "manager", "viewer", "intern"];

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}

export function canUseTool(role: Role, toolName: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(toolName) ?? false;
}

// Check data-level restrictions for a tool call
export function checkDataRestriction(role: Role, toolName: string, args: Record<string, unknown>): string | null {
  const restrictions = DATA_RESTRICTIONS[role];
  if (!restrictions || !restrictions[toolName]) return null; // no restriction

  if (toolName === "db_query") {
    const query = (args.query as string).toLowerCase();
    const allowedTables = restrictions[toolName];
    // Block queries to user_db if not allowed
    if (query.includes("user") && !allowedTables.includes("user_db")) {
      return `[RBAC] Access denied: role '${role}' cannot query the user_db table. Allowed tables: ${allowedTables.join(", ")}`;
    }
  }

  if (toolName === "read_file") {
    const path = (args.path as string).toLowerCase();
    const allowedScope = restrictions[toolName];
    if (!allowedScope.includes("secrets") && !allowedScope.includes("env")) {
      if (path.includes(".env") || path.includes("secret")) {
        return `[RBAC] Access denied: role '${role}' cannot read sensitive files (.env, secrets)`;
      }
    }
  }

  return null; // allowed
}
