// Extract the first JSON object/array from LLM output that may be wrapped
// in markdown fences or surrounded by prose.

export function extractJson(text: string): string {
  const trimmed = text.trim();

  // Direct JSON?
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;

  // Markdown fenced block ```json ... ``` or ``` ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const inner = fence[1].trim();
    if (inner.startsWith("{") || inner.startsWith("[")) return inner;
  }

  // First balanced object scan
  const start = trimmed.search(/[{[]/);
  if (start >= 0) {
    const open = trimmed[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return trimmed.slice(start, i + 1);
      }
    }
  }

  throw new Error("No JSON found in LLM output");
}
