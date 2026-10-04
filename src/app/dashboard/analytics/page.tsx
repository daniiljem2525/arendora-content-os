import { analyticsSummary } from "@/lib/agents/analytics";
import { prisma } from "@/lib/db";
import { StatCard, Section, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [summary30, insights] = await Promise.all([
    analyticsSummary(30),
    prisma.learningInsight.findMany({ orderBy: { confidence: "desc" }, take: 6 }),
  ]);

  return (
    <div className="space-y-8">
      <Section
        title="Analytics - last 30 days"
        action={<ActionButton endpoint="/api/v1/analytics" body={{ days: 7 }} label="Collect metrics" pendingLabel="Collecting..." />}
      >
        <div className="mb-4 text-sm text-slate-500">
          Data source:{" "}
          {summary30.isMock ? (
            <span className="font-medium text-violet-600">MOCK (labeled demo data, ANALYTICS_MOCK_DATA=true)</span>
          ) : (
            <span className="font-medium text-emerald-600">live integrations</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Impressions" value={summary30.impressions.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Views" value={summary30.views.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Likes" value={summary30.likes.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Saves" value={summary30.saves.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Profile visits" value={summary30.profileVisits.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Website visits" value={summary30.websiteVisits.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Registrations" value={summary30.registrations.toLocaleString()} mock={summary30.isMock} />
          <StatCard label="Activated users" value={summary30.activatedUsers.toLocaleString()} mock={summary30.isMock} />
        </div>
      </Section>

      <Section title="By platform">
        {summary30.byPlatform.length === 0 ? (
          <EmptyState text="No analytics records yet - run 'Collect metrics'" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>Registrations</th>
                <th>Conversions</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {summary30.byPlatform.map((p) => (
                <tr key={p.platform}>
                  <td className="font-medium">{p.platform}</td>
                  <td>{p.impressions.toLocaleString()}</td>
                  <td>{p.clicks.toLocaleString()}</td>
                  <td>{p.registrations.toLocaleString()}</td>
                  <td>{p.conversions.toLocaleString()}</td>
                  <td>{p.isMock ? <span className="text-violet-600">mock</span> : <span className="text-emerald-600">live</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Top learning insights" action={<ActionButton endpoint="/api/v1/agents" body={{ workflow: "learning" }} label="Re-run learning" pendingLabel="Analyzing..." className="btn-secondary" />}>
        {insights.length === 0 ? (
          <EmptyState text="No insights yet - the Learning Agent needs published content with metrics" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((i) => (
              <div key={i.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{i.kind}</span>
                  <span className="text-xs text-slate-400">confidence {(i.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-2 text-sm">{i.finding}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
