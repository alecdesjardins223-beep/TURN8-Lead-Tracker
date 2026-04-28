export type ContactConfidence = "manual" | "verified" | "likely" | "inferred";
export type ContactSource     = "manual" | "enrichment";

// A single contact data point with provenance metadata.
export interface ContactFieldRecord {
  value:       string;
  source:      ContactSource;
  confidence:  ContactConfidence;
  lastUpdated: string; // ISO timestamp
}

// The full enriched-contacts object stored in metadata.enrichedContacts
export interface EnrichedContacts {
  workEmail?:      ContactFieldRecord;
  phone?:          ContactFieldRecord;
  linkedinUrl?:    ContactFieldRecord;
  companyWebsite?: ContactFieldRecord;
  enrichedAt:      string;
  provider:        string;
}

// Provider input
export interface EnrichmentInput {
  firstName:    string;
  lastName:     string;
  title?:       string | null;
  company?:     string | null;
  location?:    string | null;
  linkedinUrl?: string | null;
  email?:       string | null;
}

// What a provider returns (pre-metadata wrapping)
export interface EnrichedField {
  value:      string;
  confidence: ContactConfidence;
}

export interface EnrichmentResult {
  workEmail?:      EnrichedField;
  phone?:          EnrichedField;
  linkedinUrl?:    EnrichedField;
  companyWebsite?: EnrichedField;
}

export interface EnrichmentProvider {
  name: string;
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;
}
