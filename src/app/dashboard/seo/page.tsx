import { prisma } from "@/lib/db";
import { Section, StatusBadge, EmptyState } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";
import { ArticleView } from "./ArticleView";

export const dynamic = "force-dynamic";

export default async function SeoPage() {
  const [keywords, articles] = await Promise.all([
    prisma.keyword.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.seoArticle.findMany({
      include: { keyword: { select: { phrase: true, intent: true, cluster: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-8">
      <Section
        title="SEO keywords"
        action={<ActionButton endpoint="/api/v1/seo" body={{ count: 5 }} label="Research keywords" pendingLabel="Researching..." />}
      >
        {keywords.length === 0 ? (
          <EmptyState text="No keywords yet" />
        ) : (
          <table className="table-base card">
            <thead>
              <tr>
                <th>Phrase</th>
                <th>Intent</th>
                <th>Cluster</th>
                <th>Volume</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.id}>
                  <td className="font-medium">{k.phrase}</td>
                  <td>{k.intent}</td>
                  <td className="text-slate-500">{k.cluster ?? "-"}</td>
                  <td>{k.volume ?? <span className="text-slate-400">unknown</span>}</td>
                  <td><StatusBadge status={k.status} /></td>
                  <td>
                    <ActionButton
                      endpoint="/api/v1/seo"
                      body={{ keywordId: k.id }}
                      label="Write article"
                      pendingLabel="Writing..."
                      className="btn-secondary"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="SEO articles">
        {articles.length === 0 ? (
          <EmptyState text="No articles yet - pick a keyword and write one" />
        ) : (
          <div className="space-y-4">
            {articles.map((a) => (
              <ArticleView
                key={a.id}
                article={{
                  id: a.id,
                  keyword: a.keyword?.phrase ?? "-",
                  title: a.title,
                  metaDescription: a.metaDescription,
                  h1: a.h1,
                  outline: JSON.parse(a.outline) as unknown[],
                  body: a.body ?? "",
                  internalLinks: JSON.parse(a.internalLinks) as unknown[],
                  faq: JSON.parse(a.faqSchema) as { q: string; a: string }[],
                  cta: a.cta ?? "",
                  status: a.status,
                }}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
