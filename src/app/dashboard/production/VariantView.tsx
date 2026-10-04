"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/ui";
import { ActionButton } from "@/components/ActionButton";

export function VariantView({
  variant,
}: {
  variant: { id: string; platform: string; kind: string; version: number; qaScore: number | null; status: string; payload: Record<string, unknown> };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td>{variant.platform}</td>
        <td className="font-medium">{variant.kind}</td>
        <td>v{variant.version}</td>
        <td>{variant.qaScore ?? "-"}</td>
        <td><StatusBadge status={variant.status} /></td>
        <td>
          <div className="flex flex-wrap items-center gap-1">
            {variant.status === "draft" && (
              <ActionButton
                endpoint="/api/v1/approvals"
                body={{ variantId: variant.id, decision: "approve" }}
                label="Approve anyway"
                pendingLabel="..."
                className="btn-secondary !px-2 !py-1 !text-xs"
                confirmText="QA отклонил этот вариант. Одобрить его принудительно?"
              />
            )}
            <button className="text-xs text-brand-600 hover:underline" onClick={() => setOpen(!open)}>
              {open ? "hide" : "view"}
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-slate-50">
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
              {JSON.stringify(variant.payload, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
