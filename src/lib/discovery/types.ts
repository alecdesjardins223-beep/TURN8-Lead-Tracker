import { z } from "zod";

export const LeadCandidateSchema = z.object({
  firstName:   z.string().min(1),
  lastName:    z.string().min(1),
  title:       z.string().nullish(),
  company:     z.string().nullish(),
  location:    z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  email:       z.string().email().nullish(),
  source:      z.string().optional(), // citation / evidence URL
});

export type LeadCandidate = z.infer<typeof LeadCandidateSchema>;

export const CandidateArraySchema = z.array(LeadCandidateSchema);

export interface SearchProfileInput {
  name:      string;
  archetype: string;
  filters: {
    geography?:   string[];
    industries?:  string[];
    titles?:      string[];
    fundingStage?: string[];
    keywords?:    string[];
    [key: string]: unknown;
  };
}

export interface DiscoveryResult {
  candidates:  LeadCandidate[];
  rawOutput:   unknown;
}

export interface DiscoveryProvider {
  name: string;
  discover(profile: SearchProfileInput): Promise<DiscoveryResult>;
}
