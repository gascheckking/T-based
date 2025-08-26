export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

// Always call Wield through our server proxy: /api/wield/<path>
export async function wieldFetch(path, init = {}) {
  const clean = String(path || "").replace(/^\/?/, "");
  const res = await fetch(`/api/wield/${clean}`, { ...init, cache: "no-store" });
  if (!res.ok) {
    const t = await safeText(res);
    throw new Error(`Wield ${res.status} ${t || ""}`.trim());
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

async function safeText(r) { try { return await r.text(); } catch { return ""; } }
