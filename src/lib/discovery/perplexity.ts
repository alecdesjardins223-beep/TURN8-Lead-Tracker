import { LeadCandidateSchema } from "./types";
import type { DiscoveryProvider, DiscoveryResult, LeadCandidate, SearchProfileInput } from "./types";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";

function buildPrompt(profile: SearchProfileInput): string {
  const { filters } = profile;
  const lines: string[] = [
    `Profile name: ${profile.name}`,
    `Lead archetype: ${profile.archetype.replace(/_/g, " ")}`,
  ];
  if (filters.geography?.length)   lines.push(`Geography: ${filters.geography.join(", ")}`);
  if (filters.industries?.length)  lines.push(`Industries: ${filters.industries.join(", ")}`);
  if (filters.titles?.length)      lines.push(`Target titles/personas: ${filters.titles.join(", ")}`);
  if (filters.fundingStage?.length)lines.push(`Funding stage: ${filters.fundingStage.join(", ")}`);
  if (filters.keywords?.length)    lines.push(`Keywords/signals: ${filters.keywords.join(", ")}`);

  return `
Find 5–8 real, publicly identifiable individuals matching this wealth-management prospect profile:

${lines.join("\n")}

Return ONLY a valid JSON array — no markdown, no prose, no code fences. Each element must have exactly these fields (use null for unknown values):
[
  {
    "firstName": "string",
    "lastName": "string",
    "title": "string | null",
    "company": "string | null",
    "location": "string | null",
    "linkedinUrl": "string | null",
    "email": null,
    "source": "brief description of where this person was found"
  }
]
`.trim();
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find the first [...] block
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text.trim();
}

export class PerplexityDiscoveryProvider implements DiscoveryProvider {
  readonly name = "perplexity";

  constructor(private readonly apiKey: string) {}

  async discover(profile: SearchProfileInput): Promise<DiscoveryResult> {
    const body = {
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a B2B research assistant. Respond only with a valid JSON array of lead candidates. No prose, no markdown, no explanation.",
        },
        { role: "user", content: buildPrompt(profile) },
      ],
      return_citations: true,
    };

    const res = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Perplexity API error ${res.status}: ${text}`);
    }

    const raw = await res.json();
    const content: string = raw?.choices?.[0]?.message?.content ?? "";

    // Parse JSON, tolerating code fences and wrapper objects
    let rawArray: unknown[];
    try {
      const parsed = JSON.parse(extractJson(content));
      if (Array.isArray(parsed)) {
        rawArray = parsed;
      } else if (parsed && typeof parsed === "object") {
        // Handle {"candidates": [...]} or {"results": [...]} wrappers
        const nested =
          (parsed as Record<string, unknown>).candidates ??
          (parsed as Record<string, unknown>).results ??
          (parsed as Record<string, unknown>).leads;
        rawArray = Array.isArray(nested) ? nested : [];
      } else {
        rawArray = [];
      }
    } catch (e) {
      throw new Error(
        `Could not parse Perplexity response as JSON: ${e instanceof Error ? e.message : "parse error"}. ` +
          `Raw content (first 300 chars): ${content.slice(0, 300)}`
      );
    }

    // Validate each candidate individually — skip malformed ones rather than failing the run
    const candidates: LeadCandidate[] = rawArray.flatMap((item) => {
      const result = LeadCandidateSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });

    if (candidates.length === 0) {
      throw new Error(
        `Perplexity returned ${rawArray.length} item(s) but none passed validation. ` +
          `Check rawOutput in the WorkflowRun for details.`
      );
    }

    return { candidates, rawOutput: raw };
  }
}
