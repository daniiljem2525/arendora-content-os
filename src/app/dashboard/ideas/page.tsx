import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await prisma.idea.findMany({
    include: { researchItem: { select: { title: true, type: true } }, campaign: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { totalScore: "desc" }],
    take: 100,
  });
  const research = await prisma.researchItem.findMany({ orderBy: { createdAt: "desc" }, take: 30 });

  return (
    <div className="space-y-8">
      <Section
        title="Research insights"
        action={<ActionButton endpoint="/api/v1/research" body={{ perType: 1 }} label="Run research" pendingLabel="Researching..." />}
      >
        {research.length === 0 ? (
          <EmptyState text="No research yet" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Type</th>
                <th>Insight</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {research.map((r) => (
                <tr key={r.id}>
                  <td><StatusBadge status={r.type} /></td>
                  <td>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-slate-500">{r.summary.slice(0, 140)}...</p>
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title="Ideas"
        action={
          <div className="flex gap-2">
            <ActionButton endpoint="/api/v1/agents" body={{ workflow: "daily_ideas", payload: { count: 4 } }} label="Generate ideas" pendingLabel="Generating..." className="btn-secondary" />
            <ActionButton endpoint="/api/v1/strategy" label="Score & select weekly plan" pendingLabel="Scoring..." />
          </div>
        }
      >
        {ideas.length === 0 ? (
          <EmptyState text="No ideas yet" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Idea</th>
                <th>Scores (V/R/D/C)</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((i) => (
                <tr key={i.id}>
                  <td>
                    <p className="font-medium">{i.title}</p>
                    <p className="text-slate-500">{i.angle}</p>
                    {i.researchItem && <p className="mt-1 text-xs text-slate-400">from research: {i.researchItem.title}</p>}
                  </td>
                  <td className="text-slate-500">{i.virality} / {i.relevance} / {i.differentiation} / {i.conversion}</td>
                  <td className="font-semibold">{i.totalScore || "-"}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td>
                    {i.status === "selected" && (
                      <ActionButton endpoint="/api/v1/content" body={{ ideaId: i.id }} label="Produce content" pendingLabel="Producing..." className="btn-secondary" />
                    )}
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
