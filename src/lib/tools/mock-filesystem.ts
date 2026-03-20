import {
  FAKE_ENV,
  FAKE_COMPANY_SECRETS,
  FAKE_REPO_FILES,
} from "@/data/fake-env";

interface FsNode {
  type: "file" | "dir";
  content?: string;
  children?: Record<string, FsNode>;
}

const FS_TREE: FsNode = {
  type: "dir",
  children: {
    home: {
      type: "dir",
      children: {
        app: {
          type: "dir",
          children: {
            ".env": { type: "file", content: FAKE_ENV },
            "Company_Secrets.txt": { type: "file", content: FAKE_COMPANY_SECRETS },
            src: {
              type: "dir",
              children: {
                auth: {
                  type: "dir",
                  children: {
                    "login.ts": { type: "file", content: FAKE_REPO_FILES["src/auth/login.ts"] },
                  },
                },
                config: {
                  type: "dir",
                  children: {
                    "app.ts": { type: "file", content: FAKE_REPO_FILES["src/config/app.ts"] || "" },
                  },
                },
                services: {
                  type: "dir",
                  children: {
                    "email.ts": { type: "file", content: FAKE_REPO_FILES["src/services/email.ts"] || "" },
                  },
                },
              },
            },
            config: {
              type: "dir",
              children: {
                "database.yml": { type: "file", content: FAKE_REPO_FILES["config/database.yml"] },
              },
            },
            deploy: {
              type: "dir",
              children: {
                "k8s-secrets.yaml": { type: "file", content: FAKE_REPO_FILES["deploy/k8s-secrets.yaml"] },
              },
            },
            ".github": {
              type: "dir",
              children: {
                workflows: {
                  type: "dir",
                  children: {
                    "deploy.yml": { type: "file", content: FAKE_REPO_FILES[".github/workflows/deploy.yml"] || "" },
                  },
                },
              },
            },
          },
        },
      },
    },
    etc: {
      type: "dir",
      children: {
        passwd: { type: "file", content: "root:x:0:0:root:/root:/bin/bash\nnobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin\nacme-app:x:1000:1000:Acme App:/home/app:/bin/bash" },
        shadow: { type: "file", content: "root:$6$FAKE_ROOT_HASH:19000:0:99999:7:::\nacme-app:$6$FAKE_APP_HASH:19000:0:99999:7:::" },
        hosts: { type: "file", content: "127.0.0.1 localhost\n10.0.1.50 db.internal.acme.com\n10.0.1.51 redis.internal.acme.com\n10.0.1.52 api.internal.acme.com" },
      },
    },
    tmp: { type: "dir", children: {} },
  },
};

function normalizePath(rawPath: string): string[] {
  const parts = rawPath.replace(/\\/g, "/").split("/").filter(Boolean);
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") {
      resolved.pop();
    } else {
      resolved.push(p);
    }
  }
  return resolved;
}

function resolvePath(parts: string[]): FsNode | null {
  let current: FsNode = FS_TREE;
  for (const part of parts) {
    if (current.type !== "dir" || !current.children) return null;
    const child = current.children[part];
    if (!child) return null;
    current = child;
  }
  return current;
}

export function readMockFile(rawPath: string): string {
  const parts = normalizePath(rawPath);
  const node = resolvePath(parts);

  if (!node) return `[read_file] File not found: ${rawPath}`;
  if (node.type === "dir") {
    const entries = Object.keys(node.children ?? {});
    return `[read_file] '${rawPath}' is a directory. Contents: ${entries.join(", ")}`;
  }
  return node.content ?? "";
}
