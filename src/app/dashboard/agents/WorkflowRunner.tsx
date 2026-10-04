"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkflowRunner({ workflow, description }: { workflow: string; description: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow }),
      });
      const data = await res.json();
      setResult({ ok: res.ok, detail: res.ok ? `Done. ${JSON.stringify(data.summary ?? {})}` : data.message ?? "Failed" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{workflow}</p>
        <p className="text-xs text-slate-500">{description}</p>
        {result && (
          <p className={`mt-1 text-xs ${result.ok ? "text-emerald-600" : "text-red-600"}`}>{result.detail}</p>
        )}
      </div>
      <button className="btn-secondary shrink-0" onClick={run} disabled={loading}>
        {loading ? "Running..." : "Run"}
      </button>
    </div>
  );
}
