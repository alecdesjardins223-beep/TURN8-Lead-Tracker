import { MockEnrichmentProvider } from "./mock";
import type { EnrichmentProvider } from "./types";

export function getEnrichmentProvider(): EnrichmentProvider {
  // Future: check for CLEARBIT_API_KEY, HUNTER_API_KEY, etc.
  return new MockEnrichmentProvider();
}

// Canonical email first; fall back to enriched work email if confidence >= likely.
// "inferred" is excluded — not reliable enough to send a real email.
export function resolveUsableEmail(
  canonicalEmail: string | null | undefined,
  enrichedWorkEmail: { value: string; confidence: string } | null | undefined,
): string | null {
  if (canonicalEmail) return canonicalEmail;
  if (
    enrichedWorkEmail &&
    (["manual", "verified", "likely"] as string[]).includes(enrichedWorkEmail.confidence)
  ) {
    return enrichedWorkEmail.value;
  }
  return null;
}

export type {
  EnrichmentProvider,
  EnrichedContacts,
  ContactFieldRecord,
  ContactConfidence,
  ContactSource,
  EnrichmentResult,
  EnrichmentInput,
  EnrichedField,
} from "./types";
