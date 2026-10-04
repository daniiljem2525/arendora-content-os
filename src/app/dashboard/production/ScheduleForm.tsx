"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Schedule an approved content item via the calendar API. */
export function ScheduleForm({ contentItemId }: { contentItemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [datetime, setDatetime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!datetime) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, scheduledAt: new Date(datetime).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.message ?? "Scheduling failed");
      else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Schedule
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input className="input w-56" type="datetime-local" value={datetime} onChange={(e) => setDatetime(e.target.value)} required />
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? "..." : "Save"}
      </button>
      <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
