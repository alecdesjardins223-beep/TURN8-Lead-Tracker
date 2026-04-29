export interface EmailDraft {
  subject:   string;
  body:      string;
  rationale: string;
}

export type DraftStatus = "generated" | "verified" | "sent";

export interface StoredDraft extends EmailDraft {
  generatedAt: string;
  provider:    string;
  status:      DraftStatus;
  editedAt?:   string;
  verifiedAt?: string;
  sentAt?:     string;
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
