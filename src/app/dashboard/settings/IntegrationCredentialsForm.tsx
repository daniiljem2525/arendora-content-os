"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FieldSpec {
  name: string;
  label: string;
  kind: "text" | "secret";
  required: boolean;
  hint?: string;
}

interface Spec {
  key: string;
  name: string;
  description: string;
  fields: FieldSpec[];
  docsUrl?: string;
}

export function IntegrationCredentialsForm({
  spec,
  live,
  setFields,
  source,
}: {
  spec: Spec;
  live: boolean;
  setFields: string[];
  source: "database" | "env" | "none";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    setSaved(false);
  }

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/settings/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: spec.key, fields: values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Не удалось сохранить");
        return;
      }
      setValues({});
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Удалить сохранённые данные для ${spec.name}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/settings/credentials?key=${spec.key}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "Не удалось удалить");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{spec.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{spec.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {live ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">настроено (live)</span>
          ) : (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">mock режим</span>
          )}
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setOpen(!open)}>
            {open ? "закрыть" : "изменить"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {source === "database"
          ? `Заполнено в приложении: ${setFields.join(", ") || "ничего"}`
          : source === "env"
            ? "Заполнено через .env"
            : "Не заполнено"}
        {spec.docsUrl && (
          <>
            {" - "}
            <a className="text-brand-500 hover:underline" href={spec.docsUrl} target="_blank" rel="noreferrer">
              документация API
            </a>
          </>
        )}
      </p>

      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          {spec.fields.map((f) => (
            <div key={f.name}>
              <label className="mb-0.5 block text-xs font-medium text-slate-600">
                {f.label}
                {f.required && <span className="text-red-400"> *</span>}
              </label>
              <input
                className="input text-xs"
                type={f.kind === "secret" ? "password" : "text"}
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
                placeholder={setFields.includes(f.name) ? "сохранено - введите новое, чтобы заменить" : f.hint ?? ""}
                autoComplete="off"
              />
              {f.hint && <p className="mt-0.5 text-[10px] text-slate-400">{f.hint}</p>}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button className="btn-primary !py-1.5 !text-xs" onClick={save} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
            {source === "database" && (
              <button className="btn-danger !py-1.5 !text-xs" onClick={remove} disabled={loading}>
                Удалить
              </button>
            )}
          </div>
          {saved && <p className="text-xs text-emerald-600">Сохранено (зашифровано).</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
