import type { ResearchProvider, ResearchLeadInput, ResearchBrief } from "./types";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";

function buildPrompt(lead: ResearchLeadInput): string {
  const lines: string[] = [`Name: ${lead.firstName} ${lead.lastName}`];
  if (lead.title)       lines.push(`Title: ${lead.title}`);
  if (lead.company)     lines.push(`Company: ${lead.company}`);
  if (lead.location)    lines.push(`Location: ${lead.location}`);
  if (lead.linkedinUrl) lines.push(`LinkedIn: ${lead.linkedinUrl}`);
  lines.push(`Lead type: ${lead.archetype.replace(/_/g, " ")}`);

  return `Research the following individual as a potential wealth-management prospect for an institutional allocator:

${lines.join("\n")}

Return ONLY a valid JSON object — no markdown, no prose, no code fences:
{
  "summary": "2–3 sentence professional bio of who this person is",
  "relevance": "Why this person may be a relevant wealth-management prospect",
  "signals": "Notable public signals, recent news, events, or context that makes them interesting now",
  "outreachAngle": "Specific first-outreach angle tailored to this person",
  "sources": ["array of source URLs used"]
}`.trim();
}

export class PerplexityResearchProvider implements ResearchProvider {
  readonly name = "perplexity";

  constructor(private readonly apiKey: string) {}

  async research(lead: ResearchLeadInput): Promise<ResearchBrief> {
    const res = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant for a wealth-management prospecting team. Return only valid JSON.",
          },
          { role: "user", content: buildPrompt(lead) },
        ],
        return_citations: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Perplexity API error ${res.status}: ${text}`);
    }

    const raw = await res.json();
    const content: string = raw?.choices?.[0]?.message?.content ?? "";

    const cleaned = content
      .replace(/```(?:json)?\s*/g, "")
      .replace(/```/g, "")
      .trim();

    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error(
        `Could not parse research response as JSON. Raw (first 300 chars): ${content.slice(0, 300)}`
      );
    }

    return {
      summary:       typeof obj.summary       === "string" ? obj.summary       : "",
      relevance:     typeof obj.relevance     === "string" ? obj.relevance     : "",
      signals:       typeof obj.signals       === "string" ? obj.signals       : "",
      outreachAngle: typeof obj.outreachAngle === "string" ? obj.outreachAngle : "",
      sources:       Array.isArray(obj.sources)
        ? obj.sources.filter((s): s is string => typeof s === "string")
        : [],
    };
  }
}
