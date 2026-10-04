import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { ScheduleForm } from "../production/ScheduleForm";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleString() : "-";
}

export default async function CalendarPage() {
  const items = await prisma.contentItem.findMany({
    where: { status: { in: ["approved", "awaiting_approval", "published", "draft"] } },
    include: {
      variants: { select: { id: true, platform: true, kind: true, status: true } },
      campaign: { select: { name: true } },
      idea: { select: { title: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const scheduled = items.filter((i) => i.scheduledAt);
  const unscheduled = items.filter((i) => !i.scheduledAt && i.status !== "published");

  return (
    <div className="space-y-8">
      <Section title="Scheduled content">
        {scheduled.length === 0 ? (
          <EmptyState text="Nothing scheduled yet - approve content and schedule it from Production" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Content</th>
                <th>Platforms</th>
                <th>Campaign</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap font-medium">{fmt(i.scheduledAt)}</td>
                  <td>{i.idea.title}</td>
                  <td className="text-slate-500">{[...new Set(i.variants.map((v) => v.platform))].join(", ")}</td>
                  <td className="text-slate-500">{i.campaign?.name ?? "-"}</td>
                  <td><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Approved, waiting for a slot">
        {unscheduled.length === 0 ? (
          <EmptyState text="No unscheduled approved content" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Content</th>
                <th>Platforms</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unscheduled.map((i) => (
                <tr key={i.id}>
                  <td>{i.idea.title}</td>
                  <td className="text-slate-500">{[...new Set(i.variants.map((v) => v.platform))].join(", ")}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td>{i.status === "approved" && <ScheduleForm contentItemId={i.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
