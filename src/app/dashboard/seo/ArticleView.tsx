"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui";

interface Article {
  id: string;
  keyword: string;
  title: string;
  metaDescription: string;
  h1: string;
  outline: unknown[];
  body: string;
  internalLinks: unknown[];
  faq: { q: string; a: string }[];
  cta: string;
  status: string;
}

export function ArticleView({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{article.title}</p>
          <p className="text-xs text-slate-400">keyword: {article.keyword}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={article.status} />
          <button className="btn-secondary" onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Read article"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500"><strong>Meta:</strong> {article.metaDescription}</p>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-relaxed">
            {article.body}
          </pre>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium">FAQ schema suggestions</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {article.faq.map((f, i) => (
                  <li key={i}><strong>{f.q}</strong><br />{f.a}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Internal link suggestions</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                {(article.internalLinks as { anchor?: string; target?: string; reason?: string }[]).map((l, i) => (
                  <li key={i}>{l.anchor} → {l.target} <span className="text-slate-400">({l.reason})</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
