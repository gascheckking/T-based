"use client";
import { useEffect, useMemo, useState } from "react";
import { wieldFetch, CHAIN_ID } from "../lib/wield";

const TABS = ["Trading", "For Trade", "Activity", "Profile"];

export default function Page() {
  const [active, setActive] = useState("Trading");
  const [loading, setLoading] = useState(false);

  // marketplace data
  const [packs, setPacks] = useState([]);
  const [ticker, setTicker] = useState([]);

  // filters
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // profile / trade
  const [theme, setTheme] = useState("dark");
  const [wallet, setWallet] = useState("");
  const [boughtItems, setBoughtItems] = useState([]);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch marketplace + activity
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // PACKS
        const packsRes = await wieldFetch(`vibe/boosterbox/recent?limit=160&includeMetadata=true&chainId=${CHAIN_ID}`);
        const packsList = packsRes?.data || packsRes || [];
        setPacks(packsList);

        // ACTIVITY (openings, fallback opened)
        let actList = [];
        try {
          const openings = await wieldFetch(`vibe/openings/recent?limit=80&includeMetadata=true&chainId=${CHAIN_ID}`);
          actList = openings?.data || openings || [];
        } catch {
          const fb = await wieldFetch(`vibe/boosterbox/recent?limit=160&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
          actList = fb?.data || fb || [];
        }
        const activityItems = actList.map(x => ({
          id: x.id ?? `${x.contractAddress}-${x.tokenId ?? Math.random()}`,
          owner: x.owner || x.to || "",
          collection: x.collectionName || x.series || x.metadata?.collectionName || "Pack",
          tokenId: x.tokenId ?? x.id ?? x.metadata?.tokenId ?? "—",
          cardName: x.cardName || x.metadata?.name || "",
          rarity: rarityName(x.rarity),
          priceUsd: pickUsd(x),
          image: x.image || x.metadata?.image || "",
          ts: Number(x.timestamp || x.time || Date.now())
        }));
        setTicker(activityItems);

        // PROFILE (bought) if wallet
        if (wallet) {
          try {
            const profileData = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
            setBoughtItems(profileData?.boughtItems || []);
          } catch {
            setBoughtItems([]);
          }
        } else setBoughtItems([]);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet]);

  // Filter packs
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (packs || []).filter(p => {
      const creator = (p?.creator || "").toLowerCase();
      const name = (p?.name || p?.collectionName || "").toLowerCase();
      const r = rarityName(p?.rarity || p?.metadata?.rarity || "");
      const isVerified = p?.metadata?.verified === true;
      return (
        (!q || creator.includes(q) || name.includes(q)) &&
        (!verifiedOnly || isVerified) &&
        (rarityFilter === "ALL" || r === rarityFilter)
      );
    });
  }, [packs, query, verifiedOnly, rarityFilter]);

  // Verified creators sorted by their single most valuable pack (USD)
  const verifiedCreators = useMemo(() => {
    const m = new Map();
    (packs || []).forEach(p => {
      if (p?.metadata?.verified) {
        const key = p.creator || p.creatorAddress || "unknown";
        const val = usdNum(p);
        const packName = p?.name || p?.collectionName || "Pack";
        const prev = m.get(key) || { creator: key, name: p.creator || key, count: 0, top: 0, topName: "" };
        prev.count += 1;
        if (val > prev.top) { prev.top = val; prev.topName = packName; }
        m.set(key, prev);
      }
    });
    return [...m.values()].sort((a,b) => b.top - a.top).slice(0, 20);
  }, [packs]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="row">
          <div className="logo">
            <div className="logo-badge">🂡</div>
            <div>VibeMarket <span style={{opacity:.7}}>Tracker</span></div>
          </div>
          <div className="row">
            {/* Native connect/disconnect + wallet picker/QR */}
            <w3m-button />
            <button className="btn ghost" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
        <div className="tabbar">
          {TABS.map(t => (
            <button key={t} className={`tab ${active === t ? "active":""}`} onClick={() => setActive(t)}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Ticker */}
      <div className="wrapper">
        <div className="ticker-wrap panel">
          <div className="ticker-rtl">
            {(ticker.length ? ticker : []).concat(ticker).map((i, idx) => (
              <div key={`${i.id}-${idx}`} className="chip">
                {`${short(i.owner)} pulled ${i.cardName ? i.cardName + " • " : ""}${i.rarity}${i.priceUsd ? " ("+i.priceUsd+")" : ""} in ${i.collection} #${i.tokenId}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="wrapper">
        <div className="grid">
          <div>
            {/* Trading */}
            {active === "Trading" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Marketplace (Vibe-synced)</div>
                  <div className="row">
                    <input className="input" placeholder="Search packs/creators…" value={query} onChange={e=>setQuery(e.target.value)} />
                    <select className="select" value={rarityFilter} onChange={e=>setRarityFilter(e.target.value)}>
                      <option value="ALL">All</option>
                      <option value="COMMON">Common</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Epic</option>
                      <option value="LEGENDARY">Legendary</option>
                    </select>
                    <label className="row" style={{gap:6}}>
                      <input type="checkbox" checked={verifiedOnly} onChange={e=>setVerifiedOnly(e.target.checked)} />
                      <span>Verified only</span>
                    </label>
                    <a className="btn ghost" href="https://vibechain.com/market" target="_blank" rel="noreferrer">Open VibeMarket</a>
                  </div>
                </div>
                {loading ? <div>Loading…</div> : <Grid packs={filtered} />}
              </section>
            )}

            {/* For Trade (local list + optional import) */}
            {active === "For Trade" && <ForTrade wallet={wallet} />}

            {/* Activity */}
            {active === "Activity" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Recent Pulls</div>
                </div>
                <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                  {(ticker.length ? ticker : []).slice(0, 60).map(i => (
                    <div key={i.id} className="card row" style={{padding:10}}>
                      {i.image ? (
                        <img className="thumb" alt="" src={i.image} style={{width:40,height:40,borderRadius:8}} />
                      ) : (
                        <div className="thumb" style={{width:40,height:40,borderRadius:8}} />
                      )}
                      <div className="grow">
                        <div className="title">{short(i.owner)} pulled</div>
                        <div className="sub">
                          <span className="linklike">{i.collection}</span> • #{i.tokenId}
                          {" "}{rarityIcons(i.rarity)}{i.priceUsd ? ` (${i.priceUsd})` : ""}{i.cardName ? ` • ${i.cardName}` : ""}
                        </div>
                      </div>
                      <div className="muted">{new Date(i.ts).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Profile */}
            {active === "Profile" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Your Profile</div>
                  <div className="row">
                    <input className="input" placeholder="Paste your 0x… wallet (optional)" value={wallet} onChange={e=>setWallet(e.target.value)} />
                  </div>
                </div>
                <div className="cards">
                  {!wallet ? <div className="card">Use the connect button or paste an address.</div> :
                  !boughtItems.length ? <div className="card">No items found (or endpoint not available).</div> :
                  boughtItems.map(item => (
                    <div key={item.id || `${item.contract}-${item.tokenId}`} className="card">
                      <div className="meta">
                        <div className="title">{item.name || "Item"}</div>
                        <div className="sub">#{item.tokenId ?? "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column – Verified creators */}
          <aside className="panel">
            <div className="panel-head">
              <div className="panel-title">Verified Creators</div>
            </div>
            <div className="cards" style={{gridTemplateColumns:"1fr"}}>
              {verifiedCreators.length ? verifiedCreators.map(c => (
                <div key={c.creator} className="card row" style={{padding:"10px"}}>
                  <div className="grow">
                    <div className="title truncate">{c.name}</div>
                    <div className="muted">{c.creator}</div>
                  </div>
                  <div className="badge">${c.top.toLocaleString()}</div>
                </div>
              )) : <div className="card">No verified creators found.</div>}
            </div>
          </aside>
        </div>

        <div className="footer">
          Built for the Vibe community • Prototype • <a href="https://vibechain.com/market" target="_blank" rel="noreferrer">VibeMarket</a>
        </div>
      </div>
    </>
  );
}

/* ---------------- Helpers & tiny components ---------------- */

function rarityName(r) {
  const n = String(r || "").toUpperCase();
  if (["4","LEGENDARY"].includes(n)) return "LEGENDARY";
  if (["3","EPIC"].includes(n)) return "EPIC";
  if (["2","RARE"].includes(n)) return "RARE";
  if (["1","COMMON"].includes(n)) return "COMMON";
  if (["COMMON","RARE","EPIC","LEGENDARY"].includes(n)) return n;
  return "COMMON";
}
function rarityIcons(r) {
  const n = rarityName(r);
  if (n === "LEGENDARY") return "★★★★";
  if (n === "EPIC")      return "★★★";
  if (n === "RARE")      return "★★";
  return "★";
}
function pickUsd(x) {
  const val = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? x?.metadata?.usdPrice ?? null;
  const num = Number(val);
  return Number.isFinite(num) ? `$${num.toFixed(num >= 100 ? 0 : 2)}` : "";
}
function usdNum(x) {
  const v = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? x?.metadata?.usdPrice ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function short(x = "") { return x && x.length > 10 ? `${x.slice(0,6)}…${x.slice(-4)}` : (x || ""); }
function keyFor(p) { return p?.id || `${p?.contractAddress || "x"}-${p?.tokenId || Math.random()}`; }

/* ---- UI ---- */
function Grid({ packs = [] }) {
  if (!packs.length) return <div className="card">No packs found.</div>;
  return (
    <div className="cards">
      {packs.map(p => <PackCard key={keyFor(p)} pack={p} />)}
    </div>
  );
}
function PackCard({ pack }) {
  const name = pack?.name || pack?.collectionName || "Pack";
  const creator = pack?.creator || "";
  const img = pack?.image || pack?.metadata?.image || "";
  const verified = pack?.metadata?.verified === true;
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const rarity = rarityName(pack?.rarity || pack?.metadata?.rarity || "");

  return (
    <a className="card pack" href={link} target="_blank" rel="noreferrer">
      {img ? <img className="thumb lg" alt="" src={img} /> : <div className="thumb lg" />}
      <div className="meta">
        <div className="row-between">
          <div className="title">{name} {verified && <span className="badge">VERIFIED</span>}</div>
          <span className="badge">{rarity}</span>
        </div>
        <div className="sub">{short(creator)}</div>
      </div>
    </a>
  );
}

/* -------- For Trade (local + optional import) ---------- */
function ForTrade({ wallet }) {
  const [items, setItems] = useState(() => loadTradeList());
  const [form, setForm] = useState({ name:"", rarity:"COMMON", contract:"", tokenId:"", notes:"" });
  const [importing, setImporting] = useState(false);

  useEffect(() => { saveTradeList(items); }, [items]);

  const addItem = () => {
    if (!form.name && !form.contract) return;
    setItems(prev => [...prev, { ...form, id: `${form.contract}-${form.tokenId}-${Math.random()}` }]);
    setForm({ name:"", rarity:"COMMON", contract:"", tokenId:"", notes:"" });
  };
  const removeItem = (id) => setItems(prev => prev.filter(x => x.id !== id));

  const importFromWallet = async () => {
    if (!wallet) return alert("Paste an address in Profile (or use connect) first.");
    setImporting(true);
    try {
      const res = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
      const holdings = res?.holdings || res?.cards || [];
      const mapped = (holdings || []).map(h => ({
        id: `${h.contract || h.address}-${h.tokenId || h.id}-${Math.random()}`,
        name: h.name || h.series || "Item",
        rarity: rarityName(h.rarity),
        contract: h.contract || h.address || "",
        tokenId: h.tokenId || h.id || "",
        notes: ""
      }));
      setItems(prev => dedupeById([...prev, ...mapped]));
    } catch {
      alert("Import failed (owner endpoint not available). Add items manually for now.");
    } finally { setImporting(false); }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">For Trade</div>
        <div className="row">
          <button className="btn ghost" onClick={importFromWallet} disabled={importing}>
            {importing ? "Importing…" : "Import from wallet"}
          </button>
        </div>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <input className="input" placeholder="Name / Card" value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value}))} />
        <select className="select" value={form.rarity} onChange={e=>setForm(s=>({...s,rarity:e.target.value}))}>
          <option>COMMON</option><option>RARE</option><option>EPIC</option><option>LEGENDARY</option>
        </select>
        <input className="input" placeholder="Contract (0x…)" value={form.contract} onChange={e=>setForm(s=>({...s,contract:e.target.value}))} />
        <input className="input" placeholder="Token ID" value={form.tokenId} onChange={e=>setForm(s=>({...s,tokenId:e.target.value}))} />
        <button className="btn" onClick={addItem}>Add</button>
      </div>

      <div className="cards" style={{gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))"}}>
        {!items.length ? <div className="card">No items yet.</div> :
          items.map(i => (
            <div key={i.id} className="card">
              <div className="meta">
                <div className="row-between">
                  <div className="title truncate">{i.name}</div>
                  <span className="badge">{i.rarity}</span>
                </div>
                <div className="sub">{short(i.contract)} • #{i.tokenId || "—"}</div>
                {i.notes ? <div className="sub">{i.notes}</div> : null}
                <div className="row">
                  <button className="btn ghost" onClick={()=>removeItem(i.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );
}

function loadTradeList() {
  try { return JSON.parse(localStorage.getItem("forTrade") || "[]"); } catch { return []; }
}
function saveTradeList(list) {
  try { localStorage.setItem("forTrade", JSON.stringify(list || [])); } catch {}
}
function dedupeById(arr) {
  const seen = new Set(); const out = [];
  for (const x of arr) { if (seen.has(x.id)) continue; seen.add(x.id); out.push(x); }
  return out;
}
