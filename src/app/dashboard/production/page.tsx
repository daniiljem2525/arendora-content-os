import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { ScheduleForm } from "./ScheduleForm";
import { VariantView } from "./VariantView";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const items = await prisma.contentItem.findMany({
    include: {
      idea: { select: { title: true, angle: true } },
      variants: true,
      campaign: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <Section
        title="Content production"
        action={<ActionButton endpoint="/api/v1/agents" body={{ workflow: "content_production" }} label="Produce for selected ideas" pendingLabel="Producing..." />}
      >
        <p className="text-sm text-slate-500">
          Each idea becomes platform-specific variants: TikTok script, Instagram Reel, Instagram carousel, X thread, Threads post and an SEO brief.
        </p>
        {items.length === 0 ? (
          <EmptyState text="No content yet - produce content from a selected idea on the Ideas page" />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.idea.title}</p>
                    <p className="text-xs text-slate-400">{item.campaign?.name ?? "no campaign"} - updated {item.updatedAt.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.status === "awaiting_approval" && (
                      <ActionButton endpoint="/api/v1/approvals" body={{ contentItemId: item.id, decision: "approve" }} label="Approve all" pendingLabel="..." className="btn-secondary" />
                    )}
                    {(item.status === "approved" || item.status === "awaiting_approval") && (
                      <ScheduleForm contentItemId={item.id} />
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Kind</th>
                        <th>Version</th>
                        <th>QA score</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.variants.map((v) => (
                        <VariantView
                          key={v.id}
                          variant={{
                            id: v.id,
                            platform: v.platform,
                            kind: v.kind,
                            version: v.version,
                            qaScore: v.qaScore,
                            status: v.status,
                            payload: JSON.parse(v.payload) as Record<string, unknown>,
                          }}
                        />
                      ))}
                      {item.variants.length === 0 && (
                        <tr><td colSpan={6} className="text-slate-400">No variants</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
