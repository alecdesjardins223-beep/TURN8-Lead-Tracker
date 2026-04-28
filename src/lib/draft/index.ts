import { MockDraftProvider } from "./mock";
import { PerplexityDraftProvider } from "./perplexity";
import type { DraftProvider } from "./types";

export function getDraftProvider(): DraftProvider {
  const key = process.env.PERPLEXITY_API_KEY;
  if (key) return new PerplexityDraftProvider(key);
  return new MockDraftProvider();
}

export type { DraftProvider, EmailDraft, DraftInput } from "./types";
