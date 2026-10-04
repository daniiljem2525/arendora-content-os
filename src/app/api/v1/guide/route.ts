import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const md = readFileSync(path.join(process.cwd(), "docs", "CREDENTIALS-GUIDE.ru.md"), "utf8");
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<title>Инструкция: API-ключи</title>
<style>body{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1e293b}
pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:8px;overflow:auto;font-size:.85rem}
code{background:#f1f5f9;padding:.1rem .35rem;border-radius:4px;font-size:.9em}
pre code{background:none;padding:0}
h1{font-size:1.6rem}h2{border-bottom:1px solid #e2e8f0;padding-bottom:.3rem;margin-top:2rem}
table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:.4rem .6rem}
blockquote{border-left:4px solid #3d69ec;margin:0;padding:.2rem 1rem;background:#eef4ff}
a{color:#2749e0}</style></head><body>
<p><a href="/dashboard/settings">← назад в настройки</a></p>
<pre>${md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
