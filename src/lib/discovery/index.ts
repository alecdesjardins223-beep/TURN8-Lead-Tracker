import { MockDiscoveryProvider } from "./mock";
import { PerplexityDiscoveryProvider } from "./perplexity";
import type { DiscoveryProvider } from "./types";

export function getDiscoveryProvider(): DiscoveryProvider {
  const key = process.env.PERPLEXITY_API_KEY;
  if (key) return new PerplexityDiscoveryProvider(key);
  return new MockDiscoveryProvider();
}

export type { DiscoveryProvider, DiscoveryResult, LeadCandidate, SearchProfileInput } from "./types";
