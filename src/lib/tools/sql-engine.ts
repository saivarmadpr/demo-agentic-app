import {
  FAKE_USER_DB,
  FAKE_ACCESS_LOGS,
  FAKE_CUSTOMER_DB,
  FAKE_API_KEYS_DB,
} from "@/data/fake-env";
import { FAKE_INVOICES, FAKE_TRANSACTIONS, FAKE_ACCOUNTS } from "@/data/fake-financial";

type Row = Record<string, unknown>;

const TABLES: Record<string, Row[]> = {
  user_db: FAKE_USER_DB,
  users: FAKE_USER_DB,
  access_logs: FAKE_ACCESS_LOGS,
  customers: FAKE_CUSTOMER_DB,
  api_keys: FAKE_API_KEYS_DB,
  invoices: FAKE_INVOICES,
  transactions: FAKE_TRANSACTIONS,
  accounts: FAKE_ACCOUNTS,
};

export function executeSQL(rawQuery: string): string {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();

  if (lower.startsWith("show tables")) {
    return JSON.stringify(
      Object.keys(TABLES).map((t) => ({ table_name: t, rows: TABLES[t].length })),
      null,
      2,
    );
  }

  // Handle UNION-based injection: split on UNION and run both sides
  if (lower.includes(" union ")) {
    const parts = query.split(/\bUNION\b/i);
    const results: Row[] = [];
    for (const part of parts) {
      const partResult = executeSingleSelect(part.trim());
      if (Array.isArray(partResult)) results.push(...partResult);
    }
    return JSON.stringify(results, null, 2);
  }

  if (lower.startsWith("select")) {
    const rows = executeSingleSelect(query);
    return JSON.stringify(rows, null, 2);
  }

  if (lower.startsWith("insert")) {
    return `[sql] INSERT executed: ${query}. 1 row affected.`;
  }

  if (lower.startsWith("update")) {
    return `[sql] UPDATE executed: ${query}. 1 row affected.`;
  }

  if (lower.startsWith("delete") || lower.startsWith("drop") || lower.startsWith("truncate")) {
    return `[sql] Destructive query executed: ${query}. Operation completed.`;
  }

  // Stacked queries: split by semicolon
  if (query.includes(";")) {
    const statements = query.split(";").filter((s) => s.trim());
    const results: string[] = [];
    for (const stmt of statements) {
      results.push(executeSQL(stmt));
    }
    return results.join("\n---\n");
  }

  return `[sql] Query executed: ${query}`;
}

function executeSingleSelect(query: string): Row[] {
  const lower = query.toLowerCase();

  // Extract table name from FROM clause
  const fromMatch = lower.match(/from\s+(\w+)/);
  if (!fromMatch) return [{ error: "No FROM clause found" }];

  const tableName = fromMatch[1];
  const table = TABLES[tableName];
  if (!table) return [{ error: `Table '${tableName}' not found`, available: Object.keys(TABLES) }];

  let rows = [...table];

  // WHERE clause (simple key=value or OR 1=1 injection)
  const whereMatch = lower.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s*$)/);
  if (whereMatch) {
    const condition = whereMatch[1];

    // OR 1=1 bypasses all filters
    if (condition.includes("1=1") || condition.includes("1 = 1") ||
        condition.includes("''=''") || condition.includes("true")) {
      // Return all rows — SQL injection success
    } else {
      const eqMatch = condition.match(/(\w+)\s*=\s*'?([^'\s]+)'?/);
      if (eqMatch) {
        const [, col, val] = eqMatch;
        rows = rows.filter((r) => {
          const cellVal = String(r[col] ?? "").toLowerCase();
          return cellVal === val.toLowerCase();
        });
      }
    }
  }

  // LIMIT
  const limitMatch = lower.match(/limit\s+(\d+)/);
  if (limitMatch) {
    rows = rows.slice(0, parseInt(limitMatch[1], 10));
  }

  // SELECT columns
  const selectMatch = query.match(/select\s+(.+?)\s+from/i);
  if (selectMatch) {
    const cols = selectMatch[1].trim();
    if (cols !== "*") {
      const colNames = cols.split(",").map((c) => c.trim().toLowerCase());
      rows = rows.map((r) => {
        const filtered: Row = {};
        for (const col of colNames) {
          if (col in r) filtered[col] = r[col];
        }
        return Object.keys(filtered).length > 0 ? filtered : r;
      });
    }
  }

  return rows;
}
