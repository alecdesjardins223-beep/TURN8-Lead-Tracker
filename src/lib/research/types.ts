export interface ResearchBrief {
  summary:       string;
  relevance:     string;
  signals:       string;
  outreachAngle: string;
  sources:       string[];
}

export interface ResearchLeadInput {
  firstName:    string;
  lastName:     string;
  title?:       string | null;
  company?:     string | null;
  location?:    string | null;
  linkedinUrl?: string | null;
  archetype:    string;
}

export interface ResearchProvider {
  name: string;
  research(lead: ResearchLeadInput): Promise<ResearchBrief>;
}
