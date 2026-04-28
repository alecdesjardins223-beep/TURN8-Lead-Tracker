export interface EmailDraft {
  subject:   string;
  body:      string;
  rationale: string;
}

export interface DraftInput {
  firstName:     string;
  lastName:      string;
  title?:        string | null;
  company?:      string | null;
  summary:       string;
  relevance:     string;
  signals:       string;
  outreachAngle: string;
  playbook?: {
    name:             string;
    outreachGuidance: string;
  } | null;
}

export interface DraftProvider {
  name: string;
  generate(input: DraftInput): Promise<EmailDraft>;
}
