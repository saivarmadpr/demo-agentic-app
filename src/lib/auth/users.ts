import type { Role } from "@/data/rbac";

export interface User {
  userId: number;
  name: string;
  email: string;
  role: Role;
  password: string;
}

export const USERS: User[] = [
  { userId: 1, name: "John Doe",    email: "john.doe@acme.com",    role: "admin",    password: "admin123" },
  { userId: 2, name: "Jane Smith",  email: "jane.smith@acme.com",  role: "engineer", password: "eng123" },
  { userId: 3, name: "Bob Wilson",  email: "bob.wilson@acme.com",  role: "manager",  password: "mgr123" },
  { userId: 4, name: "Alice Chen",  email: "alice.chen@acme.com",  role: "viewer",   password: "view123" },
  { userId: 5, name: "Eve Taylor",  email: "eve.taylor@acme.com",  role: "intern",   password: "intern123" },
];

export function findUserByEmail(email: string): User | undefined {
  return USERS.find((u) => u.email === email);
}

export function findUserById(userId: number): User | undefined {
  return USERS.find((u) => u.userId === userId);
}
