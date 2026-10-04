import Link from "next/link";
import { prisma } from "@/lib/db";
import { analyticsSummary } from "@/lib/agents/analytics";
import { StatCard, Section, StatusBadge, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [summary, ideaCount, pendingApprovals, publishedCount, awaitingPublishCount, recentRuns, campaigns] = await Promise.all([
    analyticsSummary(30),
    prisma.idea.count({ where: { status: "new" } }),
    prisma.contentItem.count({ where: { status: "awaiting_approval" } }),
    prisma.publication.count({ where: { status: "published" } }),
    prisma.contentItem.count({ where: { status: "approved" } }),
    prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.campaign.findMany({ where: { status: "active" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-slate-500">Marketing pipeline for arendora.ru - last 30 days</p>
        </div>
        <div className="flex gap-2">
          <ActionButton endpoint="/api/v1/research" body={{ perType: 1 }} label="Run research" pendingLabel="Researching..." className="btn-secondary" />
          <ActionButton endpoint="/api/v1/agents" body={{ workflow: "daily_ideas", payload: { count: 3 } }} label="Generate ideas" pendingLabel="Generating..." className="btn-secondary" />
          <ActionButton endpoint="/api/v1/strategy" body={undefined} label="Weekly strategy" pendingLabel="Planning..." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Impressions" value={summary.impressions.toLocaleString()} mock={summary.isMock} />
        <StatCard label="Website visits" value={summary.websiteVisits.toLocaleString()} mock={summary.isMock} />
        <StatCard label="Registrations" value={summary.registrations.toLocaleString()} mock={summary.isMock} />
        <StatCard label="Conversions" value={summary.conversions.toLocaleString()} mock={summary.isMock} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Link href="/dashboard/ideas" className="card hover:border-brand-400">
          <p className="text-sm text-slate-500">New ideas</p>
          <p className="mt-1 text-2xl font-semibold">{ideaCount}</p>
        </Link>
        <Link href="/dashboard/approvals" className="card hover:border-brand-400">
          <p className="text-sm text-slate-500">Awaiting approval</p>
          <p className="mt-1 text-2xl font-semibold">{pendingApprovals}</p>
        </Link>
        <Link href="/dashboard/calendar" className="card hover:border-brand-400">
          <p className="text-sm text-slate-500">Approved, ready to schedule</p>
          <p className="mt-1 text-2xl font-semibold">{awaitingPublishCount}</p>
        </Link>
        <Link href="/dashboard/publications" className="card hover:border-brand-400">
          <p className="text-sm text-slate-500">Publications</p>
          <p className="mt-1 text-2xl font-semibold">{publishedCount}</p>
        </Link>
      </div>

      <Section title="Active campaigns">
        {campaigns.length === 0 ? (
          <EmptyState text="No active campaigns" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((c) => (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">Goal: {c.goal}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recent automation runs" action={<Link className="btn-secondary" href="/dashboard/agents">AI Agents</Link>}>
        {recentRuns.length === 0 ? (
          <EmptyState text="No automation runs yet - trigger one from the AI Agents page" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.workflow}</td>
                  <td>{r.trigger}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-slate-500">{r.startedAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
