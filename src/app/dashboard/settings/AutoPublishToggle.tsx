"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutoPublishToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings/auto-publish", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !on }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Не удалось изменить настройку");
        return;
      }
      setOn(!on);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative h-7 w-14 rounded-full transition-colors ${on ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-pressed={on}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-0.5"}`}
        />
      </button>
      <span className="text-sm font-medium">{on ? "Включена - публикация по расписанию каждую минуту" : "Выключена"}</span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
