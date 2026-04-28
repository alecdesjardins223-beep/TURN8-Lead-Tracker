import { MockEnrichmentProvider } from "./mock";
import type { EnrichmentProvider } from "./types";

export function getEnrichmentProvider(): EnrichmentProvider {
  // Future: check for CLEARBIT_API_KEY, HUNTER_API_KEY, etc.
  return new MockEnrichmentProvider();
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
