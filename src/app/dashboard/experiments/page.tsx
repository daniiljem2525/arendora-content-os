import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { NewExperimentForm } from "./NewExperimentForm";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const experiments = await prisma.experiment.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-6">
      <Section title="Experiments">
        <p className="text-sm text-slate-500">
          A/B experiments for hooks, CTAs, formats and posting times. Results are computed by the Learning Agent from performance metrics.
        </p>
        <NewExperimentForm />
        {experiments.length === 0 ? (
          <EmptyState text="No experiments yet" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Hypothesis</th>
                <th>Variants</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((e) => (
                <tr key={e.id}>
                  <td className="font-medium">{e.name}</td>
                  <td>{e.kind}</td>
                  <td className="max-w-72 text-slate-500">{e.hypothesis}</td>
                  <td className="text-slate-500">
                    {(JSON.parse(e.variants) as { key: string }[]).map((v) => v.key).join(" vs ")}
                  </td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="text-slate-500">{e.startDate.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
