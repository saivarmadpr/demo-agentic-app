import { appConfig } from "@/data/config";

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  blockedCategories: string[];
}

interface KeywordRule {
  category: string;
  patterns: RegExp[];
  weight: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    category: "hate",
    patterns: [
      /\b(hate|hatred|slur|racial\s+slur|ethnic\s+cleansing)\b/i,
      /\b(supremac|inferior\s+race|subhuman)\b/i,
    ],
    weight: 0.8,
  },
  {
    category: "violence",
    patterns: [
      /\b(kill|murder|bomb|attack|shoot|stab|assault)\b/i,
      /\b(weapon|explosive|firearm|ammunition)\b/i,
    ],
    weight: 0.6,
  },
  {
    category: "self_harm",
    patterns: [
      /\b(suicide|self[- ]harm|cut\s+myself|end\s+my\s+life)\b/i,
    ],
    weight: 0.9,
  },
  {
    category: "sexual",
    patterns: [
      /\b(explicit|pornograph|nude|sexual\s+content)\b/i,
    ],
    weight: 0.7,
  },
  {
    category: "harassment",
    patterns: [
      /\b(harass|bully|threaten|intimidat|stalk)\b/i,
      /\b(dox|doxx|swat)\b/i,
    ],
    weight: 0.7,
  },
  {
    category: "dangerous",
    patterns: [
      /\b(synthe[sz]i[sz]e?\s+(drug|meth|fentanyl|explosive))\b/i,
      /\b(how\s+to\s+make\s+a?\s*(bomb|weapon|poison|drug))\b/i,
      /\b(ricin|sarin|vx\s+gas|anthrax)\b/i,
    ],
    weight: 0.9,
  },
  {
    category: "fraud",
    patterns: [
      /\b(money\s+launder|tax\s+evasion|forge|counterfeit)\b/i,
      /\b(identity\s+theft|credit\s+card\s+fraud|phishing\s+kit)\b/i,
    ],
    weight: 0.7,
  },
];

const THRESHOLDS: Record<string, Record<string, number>> = {
  strict: { hate: 0.3, violence: 0.3, self_harm: 0.2, sexual: 0.3, harassment: 0.3, dangerous: 0.2, fraud: 0.3 },
  moderate: { hate: 0.5, violence: 0.5, self_harm: 0.3, sexual: 0.5, harassment: 0.5, dangerous: 0.3, fraud: 0.5 },
};

export function moderateContent(text: string): ModerationResult {
  if (appConfig.contentModeration === "disabled") {
    return { flagged: false, categories: {}, scores: {}, blockedCategories: [] };
  }

  const lower = text.toLowerCase();
  const categories: Record<string, boolean> = {};
  const scores: Record<string, number> = {};
  const blockedCategories: string[] = [];

  const thresholds = THRESHOLDS[appConfig.contentModeration] ?? THRESHOLDS.moderate;

  for (const rule of KEYWORD_RULES) {
    let matchCount = 0;
    for (const pattern of rule.patterns) {
      const matches = lower.match(new RegExp(pattern.source, "gi"));
      if (matches) matchCount += matches.length;
    }
    const score = Math.min(matchCount * rule.weight * 0.3, 1.0);
    scores[rule.category] = score;

    const threshold = thresholds[rule.category] ?? 0.5;
    const flagged = score >= threshold;
    categories[rule.category] = flagged;
    if (flagged) blockedCategories.push(rule.category);
  }

  return {
    flagged: blockedCategories.length > 0,
    categories,
    scores,
    blockedCategories,
  };
}
