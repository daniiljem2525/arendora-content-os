"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Generic client button that POSTs/PATCHes an API endpoint and refreshes. */
export function ActionButton({
  endpoint,
  body,
  method = "POST",
  label,
  pendingLabel = "Working...",
  className = "btn-primary",
  confirmText,
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  method?: string;
  label: string;
  pendingLabel?: string;
  className?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) setError(data.message ?? data.error ?? "Request failed");
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button className={className} onClick={run} disabled={loading}>
        {loading ? pendingLabel : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
