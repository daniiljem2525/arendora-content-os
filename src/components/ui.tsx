import { STATUS_LABELS } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    ai_review: "bg-amber-100 text-amber-700",
    awaiting_approval: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    published: "bg-emerald-600 text-white",
    failed: "bg-red-100 text-red-700",
    archived: "bg-slate-200 text-slate-500",
    mock: "bg-violet-100 text-violet-700",
    pending: "bg-amber-100 text-amber-700",
    new: "bg-slate-100 text-slate-600",
    selected: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-600",
    produced: "bg-emerald-100 text-emerald-700",
    used: "bg-emerald-100 text-emerald-700",
    running: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700",
    targeting: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-slate-100 text-slate-600"}`}>
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function StatCard({ label, value, hint, mock }: { label: string; value: string | number; hint?: string; mock?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {mock && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">MOCK</span>}
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">{text}</div>;
}
