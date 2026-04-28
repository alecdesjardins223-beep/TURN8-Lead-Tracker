import { MockResearchProvider } from "./mock";
import { PerplexityResearchProvider } from "./perplexity";
import type { ResearchProvider } from "./types";

export function getResearchProvider(): ResearchProvider {
  const key = process.env.PERPLEXITY_API_KEY;
  if (key) return new PerplexityResearchProvider(key);
  return new MockResearchProvider();
}

export type { ResearchProvider, ResearchBrief, ResearchLeadInput } from "./types";
export { mergeResearch, prependToHistory } from "./merge";
export type { StoredBrief } from "./merge";
