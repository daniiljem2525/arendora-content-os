import { prisma } from "@/lib/db";
import { currentLlmMode } from "@/lib/agents/base";
import { WORKFLOW_NAMES } from "@/lib/agents/registry";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { WorkflowRunner } from "./WorkflowRunner";
import { JobToggle } from "./JobToggle";

export const dynamic = "force-dynamic";

const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  daily_research: "Research Agent: collect pain points, trends, competitor topics, SEO opportunities",
  daily_ideas: "Idea Generation: turn research insights into content ideas",
  weekly_strategy: "Strategy Agent: score ideas and select the weekly plan",
  content_production: "Content Agent: produce platform variants for selected ideas",
  video_production: "Video Agent: build a video package for a content item (needs contentItemId)",
  seo_research: "SEO Agent: keyword research",
  seo_article: "SEO Agent: write article for a keyword (needs keywordId)",
  qa_review: "QA Agent: review pending variants",
  analytics_collection: "Analytics Agent: collect/store performance metrics",
  learning: "Learning Agent: extract winning patterns",
  publish_scheduled: "Publish approved content whose scheduled time has arrived",
  weekly_report: "Weekly performance report (Telegram if configured)",
};

export default async function AgentsPage() {
  const [jobDefs, runs, pending, llm] = await Promise.all([
    prisma.jobDefinition.findMany({ orderBy: { key: "asc" } }),
    prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 25 }),
    prisma.contentVariant.count({ where: { status: { in: ["draft", "ai_review"] } } }),
    currentLlmMode(),
  ]);

  return (
    <div className="space-y-8">
      <Section title="AI agents">
        <p className="text-sm text-slate-500">
          Generation engine: <span className={llm === "live" ? "font-medium text-emerald-600" : "font-medium text-violet-600"}>{llm === "live" ? "LLM API (OpenAI-compatible)" : "builtin engine - no API key required"}</span>
          . Pending QA reviews: {pending}.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {WORKFLOW_NAMES.map((w) => (
            <WorkflowRunner key={w} workflow={w} description={WORKFLOW_DESCRIPTIONS[w] ?? w} />
          ))}
        </div>
      </Section>

      <Section title="Scheduled jobs">
        <p className="text-sm text-slate-500">These run via the scheduler process (<code className="rounded bg-slate-100 px-1">npm run scheduler</code>).</p>
        <table className="table-base card">
          <thead>
            <tr>
              <th>Job</th>
              <th>Cron</th>
              <th>Workflow</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {jobDefs.map((j) => (
              <tr key={j.id}>
                <td className="font-medium">{j.name}</td>
                <td><code className="rounded bg-slate-100 px-1">{j.cron}</code></td>
                <td>{j.workflow}</td>
                <td><JobToggle jobKey={j.key} enabled={j.enabled} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Recent job runs">
        {runs.length === 0 ? (
          <EmptyState text="No runs yet" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Started</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.workflow}</td>
                  <td>{r.trigger}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-slate-500">{r.startedAt.toLocaleString()}</td>
                  <td className="max-w-96">
                    <details>
                      <summary className="cursor-pointer text-xs text-brand-600">view log</summary>
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 text-[10px] text-slate-100">{(r.error ?? r.logs) || "(empty)"}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
