"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewExperimentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          hypothesis,
          variants: [
            { key: variantA || "A", description: variantA },
            { key: variantB || "B", description: variantB },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.message ?? "Failed to create experiment");
      else {
        setOpen(false);
        setName("");
        setHypothesis("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary w-fit" onClick={() => setOpen(true)}>
        New experiment
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <input className="input" placeholder="Experiment name" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
      <input className="input" placeholder="Hypothesis" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} required minLength={5} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Variant A (e.g. question hook)" value={variantA} onChange={(e) => setVariantA(e.target.value)} />
        <input className="input" placeholder="Variant B (e.g. stat hook)" value={variantB} onChange={(e) => setVariantB(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Creating..." : "Create"}</button>
        <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
