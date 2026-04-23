"use client";

import { useState, useTransition } from "react";
import { runDiscovery } from "./actions";
import type { DiscoveryActionResult } from "./actions";

export function RunDiscoveryButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DiscoveryActionResult | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const r = await runDiscovery(profileId);
      setResult(r);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      >
        {isPending ? "Running…" : "Run Discovery"}
      </button>
      {result?.ok === true && (
        <p className="text-xs text-green-600">
          {result.candidatesFound} found · {result.leadsCreated} created · {result.leadsSkipped} skipped
        </p>
      )}
      {result?.ok === false && (
        <p className="text-xs text-red-600 max-w-xs text-right">{result.error}</p>
      )}
    </div>
  );
}
