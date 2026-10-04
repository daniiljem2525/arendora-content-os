"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BrandRuleEditor({ ruleKey, value, category }: { ruleKey: string; value: string; category: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: ruleKey, value: draft }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.message ?? "Save failed");
      else {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{category}</span>
          <span className="text-sm font-medium">{ruleKey.replace(/_/g, " ")}</span>
        </div>
        {!editing && (
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>
            edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea className="input min-h-32 font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary !py-1.5 !text-xs" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="btn-secondary !py-1.5 !text-xs" onClick={() => { setEditing(false); setDraft(value); }}>
              Cancel
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </div>
      ) : (
        <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{value}</pre>
      )}
    </div>
  );
}
