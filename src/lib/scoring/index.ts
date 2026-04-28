import type { StoredBrief } from "@/lib/research";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PriorityLabel = "High Priority" | "Review" | "Monitor" | "Low Fit";

export interface FactorBreakdown {
  triggerStrength:  number; // 0–3
  personaFit:       number; // 0–3
  complexityNeed:   number; // 0–3
  evidenceQuality:  number; // 0–3
}

export interface WeightSet {
  triggerStrength:  number; // four weights that sum to 1.0
  personaFit:       number;
  complexityNeed:   number;
  evidenceQuality:  number;
}

export interface LeadScore {
  total:      number;        // 0–100
  label:      PriorityLabel;
  rationale:  string;        // deterministic, assembled from factor results
  scoredAt:   string;        // ISO timestamp
  playbookId: string | null; // which playbook was active at score time
  factors:    FactorBreakdown;
  weights:    WeightSet;
}

// ─── Playbook weights ─────────────────────────────────────────────────────────
// Each row sums to 1.0. Weights express what matters most for that segment.

const DEFAULT_WEIGHTS: WeightSet = {
  triggerStrength:  0.30,
  personaFit:       0.30,
  complexityNeed:   0.20,
  evidenceQuality:  0.20,
};

const PLAYBOOK_WEIGHTS: Record<string, WeightSet> = {
  // Ownership + succession/liquidity triggers dominate
  "playbook-business-owners": {
    triggerStrength:  0.40,
    personaFit:       0.30,
    complexityNeed:   0.15,
    evidenceQuality:  0.15,
  },
  // Role seniority + equity/transition complexity equally important
  "playbook-senior-executives": {
    triggerStrength:  0.35,
    personaFit:       0.35,
    complexityNeed:   0.15,
    evidenceQuality:  0.15,
  },
  // Depth of philanthropic / governance evidence is the key differentiator
  "playbook-board-philanthropy": {
    triggerStrength:  0.20,
    personaFit:       0.30,
    complexityNeed:   0.10,
    evidenceQuality:  0.40,
  },
  // Corp structure + tax/planning complexity is the primary indicator
  "playbook-incorporated-professionals": {
    triggerStrength:  0.20,
    personaFit:       0.25,
    complexityNeed:   0.40,
    evidenceQuality:  0.15,
  },
  "seed-playbook-founders": {
    triggerStrength:  0.40,
    personaFit:       0.25,
    complexityNeed:   0.15,
    evidenceQuality:  0.20,
  },
};

// ─── Keyword tables ───────────────────────────────────────────────────────────

// triggerStrength — scanned from research.signals
// Score 3: clear near-term liquidity or transition event
// Score 2: meaningful growth or structural change signal
// Score 1: some activity; no strong event identified
const TRIGGER_STRONG = [
  "exit", "acqui", "ipo", "going public",
  "merger", "buyout", "succession plan",
  "liquidity event", "sold company", "sale process",
  "acquisition", "went public", "strategic review",
] as const;

const TRIGGER_MEDIUM = [
  "funding", "series a", "series b", "series c", "series d",
  "expansion", "capital raise", "raised", "new office",
  "key hire", "opened",
] as const;

const TRIGGER_WEAK = [
  "launched", "announced", "recent", "promoted",
  "partnership", "awarded", "new role", "appointed",
] as const;

// personaFit — per-playbook keyword sets, scanned from summary + relevance
// Count of distinct matches, capped at 3
const PERSONA_KEYWORDS: Record<string, readonly string[]> = {
  "playbook-business-owners": [
    "owner", "founder", "co-founder", "ceo", "managing partner",
    "principal", "proprietor", "family business", "private company", "enterprise",
  ],
  "playbook-senior-executives": [
    "executive", "c-suite", "chief ", "cfo", "coo", "cto",
    "vp ", "vice president", "president", "officer",
    "managing director", "head of",
  ],
  "playbook-board-philanthropy": [
    "board", "trustee", "foundation", "philanthrop", "nonprofit",
    "investment committee", "endowment", "impact invest",
    "charitable", "chair", "governance",
  ],
  "playbook-incorporated-professionals": [
    "physician", "doctor", "dentist", "surgeon", "specialist",
    "lawyer", "attorney", "solicitor", "accountant", "cpa",
    "professional corporation", "medical practice", "clinic",
  ],
  "seed-playbook-founders": [
    "founder", "co-founder", "startup", "venture",
    "early-stage", "seed stage", "built", "ceo",
  ],
};

// complexityNeed — scanned from relevance + summary
// Count of distinct matches, capped at 3
const COMPLEXITY_KEYWORDS = [
  "complex", "planning", "structur",
  "corporation", "trust", "estate",
  "tax", "equity compensation", "stock option",
  "vested", "rsu", "restricted stock",
  "partnership", "succession", "liquidity",
  "concentrated", "wealth management", "holdco",
  "holding company", "cross-border", "offshore",
  "diversif", "asset protection",
] as const;

// ─── Factor scorers ───────────────────────────────────────────────────────────

function isStub(text: string): boolean {
  return (
    !text ||
    text.trim().length < 30 ||
    text.toLowerCase().includes("stub —") ||
    text.toLowerCase().includes("stub:")
  );
}

function lc(s: string): string { return s.toLowerCase(); }

function scoreTriggerStrength(signals: string): number {
  if (isStub(signals)) return 0;
  const s = lc(signals);
  if (TRIGGER_STRONG.some((k) => s.includes(k))) return 3;
  if (TRIGGER_MEDIUM.some((k) => s.includes(k))) return 2;
  if (TRIGGER_WEAK.some((k)  => s.includes(k))) return 1;
  // Brief has content but no recognised keywords — treat as weak
  return s.length > 80 ? 1 : 0;
}

function scorePersonaFit(brief: StoredBrief, playbookId: string | null): number {
  const keywords = playbookId ? (PERSONA_KEYWORDS[playbookId] ?? null) : null;
  if (!keywords) return 1; // unknown playbook — neutral score
  const text = lc(`${brief.summary} ${brief.relevance}`);
  const matches = keywords.filter((k) => text.includes(k)).length;
  return Math.min(3, matches);
}

function scoreComplexityNeed(brief: StoredBrief): number {
  const text  = lc(`${brief.relevance} ${brief.summary}`);
  const count = COMPLEXITY_KEYWORDS.filter((k) => text.includes(k)).length;
  return Math.min(3, count);
}

function scoreEvidenceQuality(brief: StoredBrief): number {
  if (isStub(brief.summary)) return 0;
  const briefLen = (
    brief.summary + brief.relevance + brief.signals + brief.outreachAngle
  ).length;
  const src = brief.sources.length;
  if (src >= 3 && briefLen > 400) return 3;
  if (src >= 2 || briefLen > 400) return 2;
  if (src >= 1 || briefLen > 100) return 1;
  return 0;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function computeTotal(f: FactorBreakdown, w: WeightSet): number {
  const raw =
    f.triggerStrength * w.triggerStrength +
    f.personaFit      * w.personaFit +
    f.complexityNeed  * w.complexityNeed +
    f.evidenceQuality * w.evidenceQuality;
  // Max raw = 3.0 (all factors = 3, weights sum to 1.0)
  return Math.round((raw / 3.0) * 100);
}

function priorityLabel(total: number): PriorityLabel {
  if (total >= 70) return "High Priority";
  if (total >= 45) return "Review";
  if (total >= 20) return "Monitor";
  return "Low Fit";
}

function buildRationale(f: FactorBreakdown): string {
  const strengths: string[] = [];
  const gaps: string[]      = [];

  if (f.triggerStrength >= 2)      strengths.push("strong trigger");
  else if (f.triggerStrength === 1) gaps.push("weak trigger");
  else                              gaps.push("no trigger identified");

  if (f.personaFit >= 2)           strengths.push("clear persona fit");
  else if (f.personaFit === 1)     gaps.push("partial persona match");
  else                             gaps.push("persona fit unclear");

  if (f.complexityNeed >= 2)       strengths.push("high advisory complexity");
  else if (f.complexityNeed === 1) strengths.push("some complexity noted");

  if (f.evidenceQuality >= 2)      strengths.push("solid evidence");
  else                             gaps.push("thin research");

  const parts: string[] = [];
  if (strengths.length) parts.push(strengths.join(", "));
  if (gaps.length)      parts.push(`gaps: ${gaps.join(", ")}`);
  return parts.join(" · ") || "Insufficient data to score.";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function scoreResearch(
  brief:      StoredBrief,
  playbookId: string | null,
): LeadScore {
  const weights = (playbookId ? PLAYBOOK_WEIGHTS[playbookId] : null) ?? DEFAULT_WEIGHTS;

  const factors: FactorBreakdown = {
    triggerStrength:  scoreTriggerStrength(brief.signals),
    personaFit:       scorePersonaFit(brief, playbookId),
    complexityNeed:   scoreComplexityNeed(brief),
    evidenceQuality:  scoreEvidenceQuality(brief),
  };

  const total = computeTotal(factors, weights);

  return {
    total,
    label:      priorityLabel(total),
    rationale:  buildRationale(factors),
    scoredAt:   new Date().toISOString(),
    playbookId,
    factors,
    weights,
  };
}
