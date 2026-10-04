import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const items = await prisma.contentItem.findMany({
    where: { status: "awaiting_approval" },
    include: { idea: { select: { title: true, angle: true } }, variants: true },
    orderBy: { updatedAt: "desc" },
  });
  const seoArticles = await prisma.seoArticle.findMany({
    where: { status: "ai_review" },
    include: { keyword: { select: { phrase: true } } },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <Section title="Approval queue">
        {items.length === 0 ? (
          <EmptyState text="Nothing awaiting approval" />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.idea.title}</p>
                    <p className="text-xs text-slate-400">{item.idea.angle}</p>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton
                      endpoint="/api/v1/approvals"
                      body={{ contentItemId: item.id, decision: "approve" }}
                      label="Approve"
                      className="btn-primary"
                    />
                    <ActionButton
                      endpoint="/api/v1/approvals"
                      body={{ contentItemId: item.id, decision: "reject" }}
                      label="Reject"
                      className="btn-danger"
                    />
                  </div>
                </div>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Platform</th>
                      <th>QA</th>
                      <th>Status</th>
                      <th>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.variants.map((v) => {
                      const report = v.qaReport ? (JSON.parse(v.qaReport) as { checks?: { check: string; passed: boolean; detail: string }[] }) : null;
                      return (
                        <tr key={v.id}>
                          <td className="font-medium">{v.kind}</td>
                          <td>{v.platform}</td>
                          <td>
                            {v.qaScore ?? "-"}
                            {report?.checks && (
                              <ul className="mt-1 space-y-0.5">
                                {report.checks.map((c) => (
                                  <li key={c.check} className={`text-xs ${c.passed ? "text-emerald-600" : "text-red-500"}`}>
                                    {c.passed ? "✓" : "✗"} {c.check} - {c.detail}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td><StatusBadge status={v.status} /></td>
                          <td>
                            <div className="flex gap-1">
                              <ActionButton endpoint="/api/v1/approvals" body={{ variantId: v.id, decision: "approve" }} label="Approve" className="btn-secondary !px-2 !py-1 !text-xs" pendingLabel="..." />
                              <ActionButton endpoint="/api/v1/approvals" body={{ variantId: v.id, decision: "reject" }} label="Reject" className="btn-danger !px-2 !py-1 !text-xs" pendingLabel="..." />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="SEO articles pending review">
        {seoArticles.length === 0 ? (
          <EmptyState text="No SEO articles pending" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Title</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {seoArticles.map((a) => (
                <tr key={a.id}>
                  <td className="text-slate-500">{a.keyword?.phrase ?? "-"}</td>
                  <td className="font-medium">{a.title}</td>
                  <td>
                    <span className="text-xs text-slate-400">review body on SEO page</span>
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
