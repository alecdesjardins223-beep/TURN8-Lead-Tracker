import type { EnrichmentProvider, EnrichmentInput, EnrichmentResult } from "./types";

export class MockEnrichmentProvider implements EnrichmentProvider {
  readonly name = "mock";

  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {};
    const first = input.firstName.toLowerCase().replace(/[^a-z]/g, "");
    const last  = input.lastName.toLowerCase().replace(/[^a-z]/g, "");

    // Infer work email from name + company domain (only when email not already known)
    if (input.company && !input.email) {
      const domain = input.company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      result.workEmail = {
        value:      `${first}.${last}@${domain}.com`,
        confidence: "inferred",
      };
    }

    // Infer LinkedIn profile URL (only when not already known)
    if (!input.linkedinUrl) {
      result.linkedinUrl = {
        value:      `https://www.linkedin.com/in/${first}-${last}`,
        confidence: "inferred",
      };
    }

    // Infer company website from company name
    if (input.company) {
      const domain = input.company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
      result.companyWebsite = {
        value:      `https://www.${domain}.com`,
        confidence: "inferred",
      };
    }

    // Phone is intentionally omitted — guessing phone numbers is unsafe
    return result;
  }
}
