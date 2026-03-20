import type { Role } from "@/data/rbac";

export type TenantId = "acme" | "globex";

export interface ConsentFlags {
  dataSharing: boolean;
  analytics: boolean;
  thirdPartyAccess: boolean;
  piiProcessing: boolean;
}

export interface User {
  userId: number;
  name: string;
  email: string;
  role: Role;
  password: string;
  tenantId: TenantId;
  consent: ConsentFlags;
}

export const USERS: User[] = [
  {
    userId: 1,
    name: "John Doe",
    email: "john.doe@acme.com",
    role: "admin",
    password: "admin123",
    tenantId: "acme",
    consent: {
      dataSharing: true,
      analytics: true,
      thirdPartyAccess: true,
      piiProcessing: true,
    },
  },
  {
    userId: 2,
    name: "Jane Smith",
    email: "jane.smith@acme.com",
    role: "engineer",
    password: "eng123",
    tenantId: "acme",
    consent: {
      dataSharing: true,
      analytics: true,
      thirdPartyAccess: false,
      piiProcessing: true,
    },
  },
  {
    userId: 3,
    name: "Bob Wilson",
    email: "bob.wilson@acme.com",
    role: "manager",
    password: "mgr123",
    tenantId: "acme",
    consent: {
      dataSharing: true,
      analytics: true,
      thirdPartyAccess: true,
      piiProcessing: false,
    },
  },
  {
    userId: 4,
    name: "Alice Chen",
    email: "alice.chen@acme.com",
    role: "viewer",
    password: "view123",
    tenantId: "acme",
    consent: {
      dataSharing: false,
      analytics: true,
      thirdPartyAccess: false,
      piiProcessing: false,
    },
  },
  {
    userId: 5,
    name: "Eve Taylor",
    email: "eve.taylor@acme.com",
    role: "intern",
    password: "intern123",
    tenantId: "acme",
    consent: {
      dataSharing: false,
      analytics: false,
      thirdPartyAccess: false,
      piiProcessing: false,
    },
  },
  {
    userId: 101,
    name: "Greg Mars",
    email: "greg.mars@globex.com",
    role: "admin",
    password: "globex_admin1",
    tenantId: "globex",
    consent: {
      dataSharing: true,
      analytics: true,
      thirdPartyAccess: true,
      piiProcessing: true,
    },
  },
  {
    userId: 102,
    name: "Hank Scorpio",
    email: "hank.scorpio@globex.com",
    role: "engineer",
    password: "globex_eng1",
    tenantId: "globex",
    consent: {
      dataSharing: true,
      analytics: true,
      thirdPartyAccess: false,
      piiProcessing: true,
    },
  },
];

export function findUserByEmail(email: string): User | undefined {
  return USERS.find((u) => u.email === email);
}

export function findUserById(userId: number): User | undefined {
  return USERS.find((u) => u.userId === userId);
}
