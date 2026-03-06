export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface InputScanResult {
  allowed: boolean;
  riskLevel: RiskLevel;
  triggers: string[];
}

interface Pattern {
  regex: RegExp;
  label: string;
  risk: RiskLevel;
}

const PATTERNS: Pattern[] = [
  // Critical: direct instruction override
  { regex: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts|constraints)/i, label: "instruction_override", risk: "critical" },
  { regex: /you\s+are\s+now\s+(a|an|in)\s+(unrestricted|unfiltered|jailbroken|DAN)/i, label: "jailbreak_identity", risk: "critical" },
  { regex: /disregard\s+(your|all|any)\s+(rules|guidelines|restrictions|safety)/i, label: "disregard_rules", risk: "critical" },
  { regex: /\bDAN\s+mode\b/i, label: "DAN_mode", risk: "critical" },

  // High: role escalation and system prompt extraction
  { regex: /pretend\s+(you('re|'re| are)\s+)?(an?\s+)?admin/i, label: "role_escalation", risk: "high" },
  { regex: /act\s+as\s+(an?\s+)?(admin|root|superuser|unrestricted)/i, label: "role_escalation", risk: "high" },
  { regex: /my\s+role\s+is\s+(now\s+)?admin/i, label: "role_escalation", risk: "high" },
  { regex: /change\s+my\s+role\s+to\s+admin/i, label: "role_escalation", risk: "high" },
  { regex: /what\s+(is|are)\s+(your|the)\s+system\s+prompt/i, label: "system_prompt_extraction", risk: "high" },
  { regex: /reveal\s+(your|the)\s+(system\s+)?prompt/i, label: "system_prompt_extraction", risk: "high" },
  { regex: /show\s+me\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i, label: "system_prompt_extraction", risk: "high" },
  { regex: /repeat\s+(everything|all)\s+(above|before)/i, label: "system_prompt_extraction", risk: "high" },

  // Medium: suspicious encoding and indirect injection
  { regex: /\batob\s*\(|btoa\s*\(|base64[_-]?decode/i, label: "base64_execution", risk: "medium" },
  { regex: /[A-Za-z0-9+/]{40,}={0,2}/, label: "base64_payload", risk: "medium" },
  { regex: /ignore\s+permissions?\s+and/i, label: "permission_bypass", risk: "medium" },
  { regex: /bypass\s+(rbac|access\s+control|permission|security)/i, label: "bypass_attempt", risk: "medium" },
  { regex: /override\s+(rbac|access|permission|security)/i, label: "override_attempt", risk: "medium" },

  // Low: suspicious but often benign
  { regex: /do\s+not\s+follow\s+(the|your)\s+rules/i, label: "rule_violation_request", risk: "low" },
  { regex: /you\s+must\s+obey\s+me/i, label: "obedience_demand", risk: "low" },
];

export function scanInput(message: string): InputScanResult {
  const triggers: string[] = [];
  let maxRisk: RiskLevel = "low";

  const riskOrder: RiskLevel[] = ["low", "medium", "high", "critical"];

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(message)) {
      triggers.push(`${pattern.label} (${pattern.risk})`);
      if (riskOrder.indexOf(pattern.risk) > riskOrder.indexOf(maxRisk)) {
        maxRisk = pattern.risk;
      }
    }
  }

  if (triggers.length === 0) {
    return { allowed: true, riskLevel: "low", triggers: [] };
  }

  return {
    allowed: maxRisk !== "critical",
    riskLevel: maxRisk,
    triggers,
  };
}
