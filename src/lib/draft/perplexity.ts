import type { DraftProvider, DraftInput, EmailDraft } from "./types";

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";

function buildPrompt(input: DraftInput): string {
  const lines: string[] = [`Name: ${input.firstName} ${input.lastName}`];
  if (input.title)   lines.push(`Title: ${input.title}`);
  if (input.company) lines.push(`Company: ${input.company}`);

  const playbookSection = input.playbook
    ? `\nPlaybook (${input.playbook.name}) — outreach guidance: ${input.playbook.outreachGuidance}`
    : "";

  return `You are drafting the first outreach email for a wealth-management firm.

Prospect:
${lines.join("\n")}

Research brief:
Summary: ${input.summary}
Why relevant: ${input.relevance}
Public signals: ${input.signals}
Suggested angle: ${input.outreachAngle}
${playbookSection}
Write a concise, professional cold email — polished and discreet, no hype or generic sales language. Use only facts from the research brief above. Two to three short paragraphs.

Return ONLY a valid JSON object — no markdown, no prose, no code fences:
{
  "subject": "Email subject line",
  "body": "Full email body",
  "rationale": "One sentence explaining the chosen angle"
}`.trim();
}

export class PerplexityDraftProvider implements DraftProvider {
  readonly name = "perplexity";

  constructor(private readonly apiKey: string) {}

  async generate(input: DraftInput): Promise<EmailDraft> {
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
              "You are a professional email writer for a wealth-management firm. Return only valid JSON.",
          },
          { role: "user", content: buildPrompt(input) },
        ],
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
        `Could not parse draft response as JSON. Raw (first 300 chars): ${content.slice(0, 300)}`
      );
    }

    return {
      subject:   typeof obj.subject   === "string" ? obj.subject   : "",
      body:      typeof obj.body      === "string" ? obj.body      : "",
      rationale: typeof obj.rationale === "string" ? obj.rationale : "",
    };
  }
}
