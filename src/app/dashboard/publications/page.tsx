import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PublicationsPage() {
  const publications = await prisma.publication.findMany({
    include: { variant: { select: { kind: true, platform: true, contentItem: { select: { title: true, idea: { select: { title: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <Section title="Publications">
        <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
          <span className="font-medium text-violet-600">MOCK</span> publications were staged without real API credentials and are{" "}
          <span className="font-medium">never reported as live posts</span>. Configure the social API keys in settings/env to publish for real.
        </div>
        {publications.length === 0 ? (
          <EmptyState text="No publications yet - approve and publish content" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Content</th>
                <th>Platform</th>
                <th>Kind</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Published at</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {publications.map((p) => (
                <tr key={p.id}>
                  <td>{p.variant.contentItem.idea.title}</td>
                  <td>{p.platform}</td>
                  <td>{p.variant.kind}</td>
                  <td>
                    <span className={`text-xs font-medium ${p.mode === "live" ? "text-emerald-600" : "text-violet-600"}`}>{p.mode.toUpperCase()}</span>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-slate-500">{p.publishedAt?.toLocaleString() ?? "-"}</td>
                  <td className="max-w-64 truncate text-xs text-slate-400">{p.error ?? p.externalUrl ?? p.externalId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
