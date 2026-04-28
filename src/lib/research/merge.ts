import type { ResearchBrief } from "./types";

export type StoredBrief = ResearchBrief & {
  generatedAt: string;
  provider:    string;
  playbookId:  string | null; // which playbook was active when this brief was generated
};

const HISTORY_LIMIT = 5;

// ---------------------------------------------------------------------------
// Field classification
//
// STABLE — objective public facts that are not shaped by which playbook is active.
//   sources  — URLs / citations; valid regardless of outreach strategy
//
// PLAYBOOK-SENSITIVE — framing and interpretation driven by the active playbook lens.
//   summary       — bio emphasis varies by persona focus
//   relevance     — entirely "relevant to THIS playbook's segment"
//   signals       — filtered/framed through the playbook's signal focus
//   outreachAngle — playbook-specific approach; meaningless across strategies
// ---------------------------------------------------------------------------

/**
 * Merge an incoming research run into the current canonical brief.
 *
 * Same playbook:    merge-forward — keep the longer text per field, union sources.
 *                   A thinner rerun does not overwrite richer existing content.
 *
 * Different playbook (or first run after schema change):
 *                   replace all playbook-sensitive text with the incoming run;
 *                   carry forward only sources (stable citations).
 */
export function mergeResearch(
  current: StoredBrief | null,
  incoming: StoredBrief,
): StoredBrief {
  if (!current) return incoming;

  const samePlaybook = normaliseId(current.playbookId) === normaliseId(incoming.playbookId);

  if (samePlaybook) {
    return {
      // Playbook-sensitive: keep the richer (longer) version
      summary:       keepLonger(current.summary,       incoming.summary),
      relevance:     keepLonger(current.relevance,     incoming.relevance),
      signals:       keepLonger(current.signals,       incoming.signals),
      outreachAngle: keepLonger(current.outreachAngle, incoming.outreachAngle),
      // Stable: always merge
      sources:       mergeSources(current.sources, incoming.sources),
      generatedAt:   incoming.generatedAt,
      provider:      incoming.provider,
      playbookId:    incoming.playbookId,
    };
  }

  // Playbook changed — replace all interpreted fields, carry over stable citations
  return {
    summary:       incoming.summary,
    relevance:     incoming.relevance,
    signals:       incoming.signals,
    outreachAngle: incoming.outreachAngle,
    sources:       mergeSources(current.sources, incoming.sources),
    generatedAt:   incoming.generatedAt,
    provider:      incoming.provider,
    playbookId:    incoming.playbookId,
  };
}

/**
 * Prepend the raw incoming run to the history array, capped at HISTORY_LIMIT.
 * Each entry is the unmerged per-run brief, including its playbookId.
 */
export function prependToHistory(
  history: StoredBrief[],
  incoming: StoredBrief,
): StoredBrief[] {
  return [incoming, ...history].slice(0, HISTORY_LIMIT);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function keepLonger(existing: string, incoming: string): string {
  return incoming.length >= existing.length ? incoming : existing;
}

function mergeSources(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [...a, ...b]) {
    const key = s.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(s.trim());
    }
  }
  return out;
}

// Treat undefined (old records without the field) identically to null
// so the first rerun after this schema change always triggers a clean replace.
function normaliseId(id: string | null | undefined): string | null {
  return id ?? null;
}
