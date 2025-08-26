// Public Base chain id (8453) with env override
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

// Always call Wield through our proxy API route
export async function wieldFetch(path, init = {}) {
  const clean = String(path || "").replace(/^\/?/, "");
  const res = await fetch(`/api/wield/${clean}`, {
    ...init,
    cache: "no-store"
  });
  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`Wield ${res.status} ${t || ""}`.trim());
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

async function safeText(r) {
  try { return await r.text(); } catch { return ""; }
}

// Numeric USD helper (for sorting creators by top value)
export function usdNum(x) {
  const v = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? x?.metadata?.usdPrice ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
