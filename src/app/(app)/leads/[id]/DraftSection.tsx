"use client";

import { useActionState } from "react";
import { SubmitButton } from "./SubmitButton";
import type { StoredDraft } from "@/lib/draft";
import type { SendDraftState } from "./actions";

const INPUT_CLS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const ACTION_BTN_CLS =
  "rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const STATUS_BADGE: Record<StoredDraft["status"], string> = {
  generated: "bg-slate-100 text-slate-600",
  verified:  "bg-green-50 text-green-700",
  sent:      "bg-blue-50 text-blue-700",
};

const STATUS_LABEL: Record<StoredDraft["status"], string> = {
  generated: "Generated",
  verified:  "Verified",
  sent:      "Sent",
};

interface DraftSectionProps {
  draft:                  StoredDraft | null;
  usableEmail:            string | null;
  researchExists:         boolean;
  generateDraftAction:    (formData: FormData) => Promise<void>;
  saveDraftEditsAction:   (formData: FormData) => Promise<void>;
  verifyDraftAction:      (formData: FormData) => Promise<void>;
  sendDraftAction:        (prev: SendDraftState, formData: FormData) => Promise<SendDraftState>;
}

export function DraftSection({
  draft,
  usableEmail,
  researchExists,
  generateDraftAction,
  saveDraftEditsAction,
  verifyDraftAction,
  sendDraftAction,
}: DraftSectionProps) {
  const [sendState, sendAction] = useActionState(sendDraftAction, null);

  const isSent     = draft?.status === "sent";
  const isVerified = draft?.status === "verified";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Draft Email</h2>
          {draft && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[draft.status]}`}>
              {STATUS_LABEL[draft.status]}
            </span>
          )}
        </div>

        {/* Re-generate with confirmation */}
        <form
          action={generateDraftAction}
          onSubmit={(e) => {
            if (
              draft &&
              !window.confirm(
                "Re-generating will replace the current draft. Any unsaved edits will be lost. Continue?",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <SubmitButton
            pendingLabel="Generating…"
            disabled={!researchExists}
            className={ACTION_BTN_CLS}
          >
            {draft ? "Re-generate draft" : "Generate draft"}
          </SubmitButton>
        </form>
      </div>

      {draft ? (
        <>
          {/* Editable subject + body */}
          <form action={saveDraftEditsAction} className="space-y-4">
            <div>
              <label htmlFor="draft-subject" className="block text-xs font-medium text-slate-500 mb-1">
                Subject
              </label>
              <input
                key={draft.subject + (draft.editedAt ?? draft.generatedAt)}
                id="draft-subject"
                name="subject"
                type="text"
                defaultValue={draft.subject}
                className={INPUT_CLS}
                disabled={isSent}
              />
            </div>

            <div>
              <label htmlFor="draft-body" className="block text-xs font-medium text-slate-500 mb-1">
                Body
              </label>
              <textarea
                key={draft.body + (draft.editedAt ?? draft.generatedAt)}
                id="draft-body"
                name="body"
                rows={10}
                defaultValue={draft.body}
                className={INPUT_CLS}
                disabled={isSent}
              />
            </div>

            {/* Angle / rationale */}
            <div>
              <p className="text-xs font-medium text-slate-500">Angle</p>
              <p className="mt-1 text-xs text-slate-500 italic">{draft.rationale}</p>
            </div>

            {/* Timestamps */}
            <p className="text-xs text-slate-400">
              Generated{" "}
              {new Date(draft.generatedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}{" "}
              via {draft.provider}
              {draft.editedAt && (
                <span>
                  {" · "}Edited{" "}
                  {new Date(draft.editedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
              {draft.verifiedAt && (
                <span>
                  {" · "}Verified{" "}
                  {new Date(draft.verifiedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
              {draft.sentAt && (
                <span>
                  {" · "}Sent{" "}
                  {new Date(draft.sentAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              )}
            </p>

            {/* Save edits — hidden once sent */}
            {!isSent && (
              <div className="flex items-center gap-3 pt-1">
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Save edits
                </SubmitButton>
                {isVerified && (
                  <p className="text-xs text-amber-600">
                    Saving edits will reset status to Generated
                  </p>
                )}
              </div>
            )}
          </form>

          {/* Verify + Send row */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {/* Mark verified */}
            {!isSent && !isVerified && (
              <form action={verifyDraftAction}>
                <SubmitButton pendingLabel="Verifying…" className={ACTION_BTN_CLS}>
                  Mark verified
                </SubmitButton>
              </form>
            )}

            {/* Send block */}
            {isSent ? (
              <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                Email sent
              </span>
            ) : !usableEmail ? (
              <span className="text-xs text-red-600">
                No usable email address — add one in Contact Info before sending.
              </span>
            ) : !isVerified ? (
              <span className="text-xs text-slate-400">
                Mark the draft verified to enable send.
              </span>
            ) : (
              <form action={sendAction}>
                <SubmitButton
                  pendingLabel="Sending…"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Send to {usableEmail}
                </SubmitButton>
              </form>
            )}

            {/* Send error feedback */}
            {sendState && !sendState.ok && (
              <p className="text-xs text-red-600">Send failed: {sendState.error}</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-400">
          {researchExists
            ? "No draft yet — click \"Generate draft\" to create one from the research brief."
            : "Research this lead first before generating a draft."}
        </p>
      )}
    </div>
  );
}
