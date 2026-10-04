import Link from "next/link";
import { getSessionFromCookies } from "@/lib/auth";
import { currentLlmMode } from "@/lib/agents/base";
import { ensureAutoPublishLoop } from "@/lib/scheduler/auto-publish";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/ideas", label: "Ideas" },
  { href: "/dashboard/calendar", label: "Content Calendar" },
  { href: "/dashboard/production", label: "Content Production" },
  { href: "/dashboard/approvals", label: "Approval Queue" },
  { href: "/dashboard/publications", label: "Publications" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/seo", label: "SEO" },
  { href: "/dashboard/experiments", label: "Experiments" },
  { href: "/dashboard/agents", label: "AI Agents" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  ensureAutoPublishLoop();
  const llm = await currentLlmMode();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">A</span>
          <span className="font-semibold">Arendora Content OS</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <p className="px-3 text-xs text-slate-400">
            Generation engine: <span className={llm === "live" ? "font-medium text-emerald-600" : "font-medium text-violet-600"}>{llm === "live" ? "LLM API" : "builtin (no API key)"}</span>
          </p>
          {session && (
            <div className="flex items-center justify-between px-3">
              <span className="truncate text-xs text-slate-500">{session.email}</span>
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
