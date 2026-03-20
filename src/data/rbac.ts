export type Role = "admin" | "engineer" | "manager" | "viewer" | "intern";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "read_file",
    "browse_url",
    "db_query",
    "write_log",
    "get_contacts",
    "create_calendar_invite",
    "read_repo",
    "gist_create",
    "send_email",
    "slack_dm",
    "read_inbox",
    "read_slack_channel",
    "execute_code",
    "http_request",
    "search_documents",
    "write_memory",
    "read_memory",
    "list_memory",
    "search_web",
    "process_uploaded_file",
  ],
  engineer: [
    "read_repo",
    "browse_url",
    "db_query",
    "write_log",
    "get_contacts",
    "create_calendar_invite",
    "slack_dm",
    "read_inbox",
    "read_slack_channel",
    "execute_code",
    "http_request",
    "search_documents",
    "write_memory",
    "read_memory",
    "list_memory",
    "search_web",
    "process_uploaded_file",
  ],
  manager: [
    "get_contacts",
    "create_calendar_invite",
    "send_email",
    "slack_dm",
    "browse_url",
    "write_log",
    "read_inbox",
    "read_slack_channel",
    "search_documents",
    "write_memory",
    "read_memory",
    "search_web",
    "process_uploaded_file",
  ],
  viewer: [
    "browse_url",
    "get_contacts",
    "write_log",
    "read_slack_channel",
    "search_documents",
    "read_memory",
    "search_web",
  ],
  intern: ["browse_url", "write_log", "search_web"],
};

export const DATA_RESTRICTIONS: Record<
  Role,
  Record<string, string[]>
> = {
  admin: {},
  engineer: {
    db_query: ["access_logs", "api_keys"],
    read_file: ["general"],
  },
  manager: {
    db_query: ["access_logs", "customers"],
  },
  viewer: {},
  intern: {},
};

export const FAKE_API_KEYS: Record<
  string,
  { userId: number; name: string; email: string; role: Role }
> = {
  ak_admin_001: {
    userId: 1,
    name: "John Doe",
    email: "john.doe@acme.com",
    role: "admin",
  },
  ak_engineer_002: {
    userId: 2,
    name: "Jane Smith",
    email: "jane.smith@acme.com",
    role: "engineer",
  },
  ak_manager_003: {
    userId: 3,
    name: "Bob Wilson",
    email: "bob.wilson@acme.com",
    role: "manager",
  },
  ak_viewer_004: {
    userId: 4,
    name: "Alice Chen",
    email: "alice.chen@acme.com",
    role: "viewer",
  },
  ak_intern_005: {
    userId: 5,
    name: "Eve Taylor",
    email: "eve.taylor@acme.com",
    role: "intern",
  },
};

export const VALID_ROLES: Role[] = [
  "admin",
  "engineer",
  "manager",
  "viewer",
  "intern",
];

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}

export function canUseTool(role: Role, toolName: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(toolName) ?? false;
}

export function checkDataRestriction(
  role: Role,
  toolName: string,
  args: Record<string, unknown>
): string | null {
  const restrictions = DATA_RESTRICTIONS[role];
  if (!restrictions || !restrictions[toolName]) return null;

  if (toolName === "db_query") {
    const query = (args.query as string).toLowerCase();
    const allowedTables = restrictions[toolName];
    if (
      query.includes("user") &&
      !allowedTables.includes("user_db")
    ) {
      return `[RBAC] Access denied: role '${role}' cannot query the user_db table. Allowed tables: ${allowedTables.join(", ")}`;
    }
    if (
      query.includes("customer") &&
      !allowedTables.includes("customers")
    ) {
      return `[RBAC] Access denied: role '${role}' cannot query the customers table. Allowed tables: ${allowedTables.join(", ")}`;
    }
  }

  if (toolName === "read_file") {
    const path = (args.path as string).toLowerCase();
    const allowedScope = restrictions[toolName];
    if (
      !allowedScope.includes("secrets") &&
      !allowedScope.includes("env")
    ) {
      if (path.includes(".env") || path.includes("secret")) {
        return `[RBAC] Access denied: role '${role}' cannot read sensitive files (.env, secrets)`;
      }
    }
  }

  return null;
}

export const ROLE_ACCESS_LEVELS: Record<Role, string> = {
  admin: "restricted",
  engineer: "confidential",
  manager: "confidential",
  viewer: "internal",
  intern: "public",
};
