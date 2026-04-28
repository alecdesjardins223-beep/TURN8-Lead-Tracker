import type { DraftProvider, DraftInput, EmailDraft } from "./types";

export class MockDraftProvider implements DraftProvider {
  readonly name = "mock";

  async generate(input: DraftInput): Promise<EmailDraft> {
    const playbookNote = input.playbook ? ` (${input.playbook.name} playbook)` : "";
    return {
      subject:   `Introduction — ${input.firstName} ${input.lastName}`,
      body: [
        `Dear ${input.firstName},`,
        "",
        `I came across your work${input.company ? ` at ${input.company}` : ""} and wanted to introduce TURN8 and our approach to alternative investments.`,
        "",
        `(Stub${playbookNote} — configure PERPLEXITY_API_KEY for a live draft.)`,
        "",
        "Best regards,",
      ].join("\n"),
      rationale: "Stub: rationale will appear here once a draft provider is configured.",
    };
  }
}
