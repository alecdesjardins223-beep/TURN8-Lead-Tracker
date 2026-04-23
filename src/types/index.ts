import type {
  Lead,
  Playbook,
  SearchProfile,
  WorkflowRun,
  User,
  LeadActivity,
  LeadArchetype,
  LeadStatus,
  UserRole,
  ActivityType,
  WorkflowRunStatus,
} from "@prisma/client";

// Re-export Prisma enums and models for use throughout the app
export { LeadArchetype, LeadStatus, UserRole, ActivityType, WorkflowRunStatus };
export type { WorkflowRun };

// Enriched types used in UI layers
export type LeadWithRelations = Lead & {
  assignedTo?: User | null;
  playbook?: Playbook | null;
  searchProfile?: SearchProfile | null;
  activities?: LeadActivity[];
};

export type PlaybookWithRelations = Playbook & {
  owner: User;
  searchProfiles?: SearchProfile[];
  _count?: { leads: number };
};

export type SearchProfileWithRelations = SearchProfile & {
  createdBy: User;
  playbook?: Playbook | null;
  _count?: { leads: number };
};

// SearchProfile filter bag schema (typed mirror of the Json column)
export interface SearchFilters {
  geography?: string[];
  industries?: string[];
  titles?: string[];
  fundingStage?: string[];
  employeeCount?: { min?: number; max?: number };
  keywords?: string[];
  [key: string]: unknown;
}

// Sidebar nav item
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: UserRole;
}
