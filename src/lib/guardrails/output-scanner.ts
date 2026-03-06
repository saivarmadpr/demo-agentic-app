export type GuardrailMode = "permissive" | "strict";

export interface OutputScanResult {
  clean: boolean;
  redactedContent: string;
  detections: string[];
  blocked: boolean;
}

interface SensitivePattern {
  regex: RegExp;
  label: string;
  replacement: string;
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // API keys
  { regex: /sk-proj-[A-Za-z0-9_-]{20,}/g, label: "OpenAI API Key", replacement: "sk-proj-[REDACTED]" },
  { regex: /sk_live_[A-Za-z0-9_-]{10,}/g, label: "Stripe Secret Key", replacement: "sk_live_[REDACTED]" },
  { regex: /AKIA[A-Z0-9]{12,}/g, label: "AWS Access Key ID", replacement: "AKIA[REDACTED]" },
  { regex: /xoxb-[A-Za-z0-9-]+/g, label: "Slack Bot Token", replacement: "xoxb-[REDACTED]" },
  { regex: /SG\.[A-Za-z0-9_-]{20,}/g, label: "SendGrid API Key", replacement: "SG.[REDACTED]" },
  { regex: /iak_FAKE_[A-Za-z0-9]+/g, label: "Internal API Key", replacement: "iak_[REDACTED]" },

  // Secrets
  { regex: /\$2[aby]\$\d{2}\$[A-Za-z0-9./]{50,}/g, label: "bcrypt hash", replacement: "$2b$[HASH_REDACTED]" },
  { regex: /\$2b\$12\$FAKE_HASH_\w+/g, label: "password hash", replacement: "$2b$[HASH_REDACTED]" },

  // SSNs
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN", replacement: "[SSN_REDACTED]" },

  // Internal emails (only redact in strict; in permissive we leave them)
  // JWT secrets
  { regex: /ultra-secret-jwt-signing-key[A-Za-z0-9-]*/g, label: "JWT Secret", replacement: "[JWT_SECRET_REDACTED]" },

  // Database connection strings with passwords
  { regex: /postgres:\/\/[^@]+@[^\s]+/g, label: "Database URL", replacement: "postgres://[REDACTED]" },

  // AWS secret keys (40-char base64-ish)
  { regex: /(?:AWS_SECRET_ACCESS_KEY|aws_secret_access_key)\s*[=:]\s*[A-Za-z0-9/+=]{30,}/g, label: "AWS Secret Key", replacement: "AWS_SECRET_ACCESS_KEY=[REDACTED]" },
];

export function scanOutput(content: string, mode: GuardrailMode = "permissive"): OutputScanResult {
  const detections: string[] = [];
  let redacted = content;

  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset regex state
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(redacted)) {
      detections.push(pattern.label);
      pattern.regex.lastIndex = 0;
      redacted = redacted.replace(pattern.regex, pattern.replacement);
    }
  }

  if (detections.length === 0) {
    return { clean: true, redactedContent: content, detections: [], blocked: false };
  }

  if (mode === "strict") {
    return {
      clean: false,
      redactedContent: `[BLOCKED] Response contained sensitive data (${detections.join(", ")}). Response has been withheld.`,
      detections,
      blocked: true,
    };
  }

  // Permissive: redact and warn
  return {
    clean: false,
    redactedContent: redacted,
    detections,
    blocked: false,
  };
}
