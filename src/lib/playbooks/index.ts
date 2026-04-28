export interface PlaybookConfig {
  id:               string;
  name:             string;
  persona:          string;
  signalFocus:      string;
  researchGuidance: string;
  outreachGuidance: string;
  scoringNotes?:    string;
}

const CONFIGS: PlaybookConfig[] = [
  {
    id:   "playbook-business-owners",
    name: "Business Owners",
    persona:
      "Owner-operators of profitable private businesses, typically with significant embedded equity and limited liquidity.",
    signalFocus:
      "Business milestones (expansion, new locations, key hires), succession or sale signals, real estate holdings, industry association leadership, founder community involvement.",
    researchGuidance:
      "Focus on the scale of the business, profitability or growth signals, and any indicators of near-term or planned liquidity. Note the sector and whether succession planning is likely. Avoid speculating on exact financials.",
    outreachGuidance:
      "Acknowledge their operational achievement without referencing finances. Frame TURN8 as a planning partner for the next stage, not a solicitor. Tone: peer-level, brief, no jargon.",
    scoringNotes:
      "Prioritise owners showing signs of near-term liquidity (sale process, partner buyout, expansion capital raise) or those 50+ where succession is plausible.",
  },
  {
    id:   "playbook-senior-executives",
    name: "Senior Executives",
    persona:
      "C-suite and senior VP-level leaders at public or well-funded private companies with meaningful equity compensation.",
    signalFocus:
      "Equity vesting or IPO lock-up expiry, company performance milestones, executive promotions or transitions, board appointments, public commentary on strategy or wealth.",
    researchGuidance:
      "Look for recent compensation disclosures or proxy statements, known equity positions, company funding or performance signals, and any transition events (IPO, acquisition, role change). Note the company stage and sector.",
    outreachGuidance:
      "Acknowledge their professional achievement concisely. Frame the conversation around planning around concentrated equity or a transition event. Tone: executive-level, time-respectful, no pitch language.",
    scoringNotes:
      "Prioritise executives at companies within 12–18 months of a liquidity event, or those with known large unvested equity positions.",
  },
  {
    id:   "playbook-board-philanthropy",
    name: "Board Members & Philanthropists",
    persona:
      "Corporate board directors and foundation participants with active philanthropic programmes and investment committee involvement.",
    signalFocus:
      "Foundation grants and filings, board appointment announcements, philanthropic press coverage, nonprofit leadership roles, major public donations, impact-investing activity.",
    researchGuidance:
      "Surface the philanthropic focus areas, foundation affiliations, and any public giving history. Note investment committee roles or endowment involvement. Flag any stated impact or ESG priorities.",
    outreachGuidance:
      "Lead with shared values around stewardship or impact rather than investment returns. Frame TURN8 as enabling more intentional giving through a stronger financial foundation. Tone: mission-aligned, collegial, not transactional.",
    scoringNotes:
      "Prioritise those serving on foundation investment committees or actively giving at scale (>$100k/year visible in public filings).",
  },
  {
    id:   "playbook-incorporated-professionals",
    name: "Incorporated Professionals",
    persona:
      "High-income licensed professionals — physicians, dentists, lawyers, accountants — operating through a professional corporation.",
    signalFocus:
      "Professional corporation registration signals, seniority and specialty indicators, practice ownership vs. employment, local property records, professional association leadership.",
    researchGuidance:
      "Identify the professional specialty, likely corporation structure, career stage, and any signals of practice growth, partnership, or succession. Do not speculate on income or billings.",
    outreachGuidance:
      "Acknowledge their professional standing without referencing income. Frame TURN8 as helping professionals optimise the interplay between the corporation and personal wealth. Tone: collegial, technically credible, peer-level.",
    scoringNotes:
      "Prioritise senior practitioners and practice owners in high-income specialties (oral surgery, radiology, corporate law, tax advisory).",
  },
  // Kept for backward compatibility with existing seed leads
  {
    id:   "seed-playbook-founders",
    name: "Founders",
    persona:
      "Early-stage and growth-stage startup founders with potential equity upside.",
    signalFocus:
      "Funding rounds, product launches, press coverage, team growth, investor relationships.",
    researchGuidance:
      "Focus on the company stage, recent funding activity, and founder background. Note any liquidity signals (secondary sales, acquisition rumours).",
    outreachGuidance:
      "Acknowledge the company mission briefly. Frame TURN8 as a resource for founders planning ahead of a liquidity event. Tone: founder-friendly, concise.",
  },
];

const CONFIG_MAP = new Map<string, PlaybookConfig>(
  CONFIGS.map((c) => [c.id, c]),
);

export function getPlaybookConfig(id: string): PlaybookConfig | undefined {
  return CONFIG_MAP.get(id);
}

export { CONFIGS as ALL_PLAYBOOK_CONFIGS };
