/** Mask government IDs for display / storage (never store full NIN/BVN). */
export function maskId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}

export function normalizePersonName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple token overlap score between two names (0–1). */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizePersonName(a).split(" ").filter(Boolean));
  const tb = new Set(normalizePersonName(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return overlap / Math.max(ta.size, tb.size);
}
