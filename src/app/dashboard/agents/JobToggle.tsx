"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JobToggle({ jobKey, enabled }: { jobKey: string; enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: jobKey, enabled: !on }),
      });
      if (res.ok) {
        setOn(!on);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
      {loading ? "..." : on ? "enabled" : "disabled"}
    </button>
  );
}
