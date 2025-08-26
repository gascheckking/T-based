"use client";
import { useEffect, useMemo, useState } from "react";
import { wieldFetch, CHAIN_ID, usdNum } from "../lib/wield";

const TABS = ["Trading", "For Trade", "Activity", "Profile", "Bubble", "Chat", "Settings", "Bought"];
const QUICK_TOKEN = process.env.NEXT_PUBLIC_QUICK_TOKEN || "";

export default function Page() {
  const [active, setActive] = useState("Trading");
  const [loading, setLoading] = useState(false);

  // marketplace data
  const [packs, setPacks] = useState([]);
  const [verified, setVerified] = useState([]);
  const [ticker, setTicker] = useState([]);

  // filters
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("ALL"); // ALL|COMMON|RARE|EPIC|LEGENDARY
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // profile / trade
  const [theme, setTheme] = useState("dark");
  const [wallet, setWallet] = useState("");
  const [boughtItems, setBoughtItems] = useState([]);

  // Theme switch
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Initial fetcher – Packs + Verified + Activity (+Bought if wallet)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // PACKS (marketplace)
        const packsRes = await wieldFetch(`vibe/boosterbox/recent?limit=120&includeMetadata=true&chainId=${CHAIN_ID}`);
        const packsList = packsRes?.data || packsRes || [];
        setPacks(packsList);

        const verifiedList = packsList.filter(p => p?.metadata?.verified === true);
        setVerified(verifiedList.slice(0, 18));

        // ACTIVITY (pulls) – try openings, fallback to opened boosterboxes
        let actList = [];
        try {
          const openings = await wieldFetch(`vibe/openings/recent?limit=60&includeMetadata=true&chainId=${CHAIN_ID}`);
          actList = openings?.data || openings || [];
        } catch {
          const fb = await wieldFetch(`vibe/boosterbox/recent?limit=120&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
          actList = fb?.data || fb || [];
        }
        const activityItems = actList.map(x => ({
          id: x.id ?? `${x.contractAddress}-${x.tokenId ?? Math.random()}`,
          owner: x.owner || x.to || "",
          collection: x.collectionName || x.series || "Pack",
          tokenId: x.tokenId ?? x.id ?? "—",
          rarity: rarityName(x.rarity),
          priceUsd: pickUsd(x),
          image: x.image || x.metadata?.image,
          ts: x.timestamp || x.time || Date.now(),
        }));
        setTicker(activityItems);

        // PROFILE (purchased) – feature-flag
        if (wallet) {
          try {
            const profileData = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
            setBoughtItems(profileData?.boughtItems || []);
          } catch {
            setBoughtItems([]);
          }
        } else {
          setBoughtItems([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [wallet]);

  // MARKETS — filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (packs || []).filter(p => {
      const creator = (p?.creator || "").toLowerCase();
      const name = (p?.name || p?.collectionName || "").toLowerCase();
      const r = rarityName(p?.rarity || p?.metadata?.rarity || "");
      const isVerified = p?.metadata?.verified === true;

      const passQuery = !q || creator.includes(q) || name.includes(q);
      const passVerified = !verifiedOnly || isVerified;
      const passRarity = rarityFilter === "ALL" || r === rarityFilter;

      return passQuery && passVerified && passRarity;
    });
  }, [packs, query, verifiedOnly, rarityFilter]);

  // unique verified creators, sorted by their most valuable pack
  const verifiedCreators = useMemo(() => {
    const map = new Map();
    (packs || []).forEach(p => {
      const isV = p?.metadata?.verified === true;
      if (!isV) return;

      const creatorKey = p.creator || p.creatorAddress || "unknown";
      const value = usdNum(p);
      const packName = p?.name || p?.collectionName || "Pack";

      const prev = map.get(creatorKey) || {
        creator: creatorKey,
        name: p.creator || creatorKey,
        count: 0,
        maxValue: 0,
        topName: ""
      };

      prev.count += 1;
      if (value > prev.maxValue) {
        prev.maxValue = value;
        prev.topName = packName;
      }
      map.set(creatorKey, prev);
    });

    return [...map.values()]
      .sort((a, b) => b.maxValue - a.maxValue)
      .slice(0, 20);
  }, [packs]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="row">
          <div className="logo">
            <div className="logo-badge">🂡</div>
            <div>VibeMarket <span style={{opacity:.7}}>Tracker</span></div>
            <div className="pill">VibePoints</div>
          </div>
          <div className="row">
            <div className="wallet-chip">{wallet ? short(wallet) : "Not Connected"}</div>
            <button className="btn" onClick={wallet ? () => setWallet("") : connectWallet(setWallet)}>
              {wallet ? "Disconnect" : "Connect"}
            </button>
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
            {(ticker.length ? ticker : [{id:"x",txt:"Waiting for pulls…"}]).map(i => (
              <div key={i.id} className="chip">
                {`${short(i.owner)} pulled ${i.rarity || ""} in ${i.collection} #${i.tokenId}`}
              </div>
            ))}
            {ticker.map(i => (
              <div key={i.id + "-dup"} className="chip">
                {`${short(i.owner)} pulled ${i.rarity || ""} in ${i.collection} #${i.tokenId}`}
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

            {/* For Trade */}
            {active === "For Trade" && (
              <ForTrade wallet={wallet} />
            )}

            {/* Activity – Recent pulls list */}
            {active === "Activity" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Recent Pulls</div>
                  <button className="btn" onClick={refreshActivity(setTicker)}>Refresh</button>
                </div>
                <div className="cards" style={{gridTemplateColumns:"1fr"}}>
                  {(ticker.length ? ticker : [{id:"y"}]).slice(0,50).map(i => (
                    <div key={i.id} className="card row" style={{padding:12, alignItems:"center"}}>
                      {i.image ? (
                        <img className="thumb" alt="" src={i.image} style={{width:56,height:56,borderRadius:12,objectFit:"cover"}} />
                      ) : (
                        <div className="thumb" style={{width:56,height:56,borderRadius:12}} />
                      )}
                      <div className="grow">
                        <div className="title">{short(i.owner)} pulled</div>
                        <div className="sub">
                          <span className="linklike">{i.collection}</span> • #{i.tokenId}
                          {" "}{rarityIcons(i.rarity)}{i.priceUsd ? ` (${i.priceUsd})` : ""}
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
                    <input className="input" placeholder="0x… wallet" value={wallet} onChange={e=>setWallet(e.target.value)} />
                    <button className="btn" onClick={() => loadProfile(wallet, setBoughtItems)}>Load</button>
                  </div>
                </div>
                <div className="cards">
                  <div className="card">PnL & holdings will connect to <code>/vibe/owner/:address</code> when the endpoint is public.</div>
                </div>
              </section>
            )}

            {/* Bubble */}
            {active === "Bubble" && (
              <section className="panel">
                <div className="panel-head"><div className="panel-title">Bubble Map</div></div>
                <div className="cards">
                  <Placeholder text="Wallet flow maps + chat. (Phase 2 – requires a small service)" />
                </div>
              </section>
            )}

            {/* Chat */}
            {active === "Chat" && (
              <section className="panel">
                <div className="panel-head"><div className="panel-title">Chat</div></div>
                <div className="cards">
                  <Placeholder text="Wallet-to-wallet / creator rooms. (Phase 2)" />
                </div>
              </section>
            )}

            {/* Settings */}
            {active === "Settings" && (
              <section className="panel">
                <div className="panel-head"><div className="panel-title">Settings</div></div>
                <div className="row" style={{marginBottom:12}}>
                  <button className="btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
                    Toggle {theme === "dark" ? "Light" : "Dark"} Mode
                  </button>
                </div>
                <div className="cards">
                  <div className="card">
                    <div className="meta">
                      <div className="title">Chain</div>
                      <div className="sub">Using Base (chainId {CHAIN_ID})</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Bought (feature-flag) */}
            {active === "Bought" && (
              <section className="panel">
                <div className="panel-head">
                  <div className="panel-title">Bought Items</div>
                </div>
                {!wallet ? (
                  <div className="card">Connect wallet first.</div>
                ) : !boughtItems.length ? (
                  <div className="card">No purchases found (or endpoint not active).</div>
                ) : (
                  <div className="cards">
                    {boughtItems.map(item => (
                      <div key={item.id || `${item.contract}-${item.tokenId}`} className="card">
                        <div className="meta">
                          <div className="title">{item.name || "Item"}</div>
                          <div className="sub">{item.description || `#${item.tokenId ?? "–"}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Right column – Verified creators */}
          <aside className="panel">
            <div className="panel-head">
              <div className="panel-title">Verified by VibeMarket</div>
              <a className="btn ghost" href="https://vibechain.com/market" target="_blank" rel="noreferrer">All</a>
            </div>
            <div className="cards">
              {(verified.length ? verified : packs.slice(0,8)).map(pack => (
                <PackSmall key={keyFor(pack)} pack={pack} />
              ))}
            </div>

            <div className="panel" style={{marginTop:12}}>
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
                    <div className="badge">{c.count}</div>
                  </div>
                )) : <div className="card">No verified creators found.</div>}
              </div>
            </div>

            <div className="panel" style={{marginTop:12}}>
              <div className="panel-head">
                <div className="panel-title">Quick Buy (token)</div>
              </div>
              <QuickBuy token={QUICK_TOKEN} />
            </div>
          </aside>
        </div>

        <div className="footer">
          Built for the Vibe community • Prototype • <a href="https://vibechain.com/market" target="_blank" rel="noreferrer">VibeMarket</a> • Created by <a href="https://x.com/spawnizz" target="_blank" rel="noreferrer">@spawnizz</a>
        </div>
      </div>
    </>
  );
}

/* ---------------- Helpers & small components ---------------- */

function connectWallet(setWallet) {
  return async () => {
    try {
      if (!window?.ethereum) return alert("No wallet found");
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accs?.[0] || "");
    } catch (e) {
      console.error(e);
    }
  };
}

function refreshActivity(setTicker) {
  return async () => {
    try {
      let list = [];
      try {
        const openings = await wieldFetch(`vibe/openings/recent?limit=60&includeMetadata=true&chainId=${CHAIN_ID}`);
        list = openings?.data || openings || [];
      } catch {
        const fb = await wieldFetch(`vibe/boosterbox/recent?limit=120&includeMetadata=true&status=opened&chainId=${CHAIN_ID}`);
        list = fb?.data || fb || [];
      }
      const items = list.map(x => ({
        id: x.id ?? `${x.contractAddress}-${x.tokenId ?? Math.random()}`,
        owner: x.owner || x.to || "",
        collection: x.collectionName || x.series || "Pack",
        tokenId: x.tokenId ?? x.id ?? "—",
        rarity: rarityName(x.rarity),
        priceUsd: pickUsd(x),
        image: x.image || x.metadata?.image,
        ts: x.timestamp || x.time || Date.now(),
      }));
      setTicker(items);
    } catch (e) { console.error(e); }
  };
}

async function loadProfile(addr, setBoughtItems) {
  if (!addr) return;
  try {
    const profileData = await wieldFetch(`vibe/owner/${addr}?chainId=${CHAIN_ID}`);
    setBoughtItems(profileData?.boughtItems || []);
    alert("Profile loaded.");
  } catch (e) {
    console.error(e);
    alert("Profile endpoint to wire: /vibe/owner/:address (PNL, holdings)");
  }
}

function rarityName(r) {
  const n = String(r || "").toUpperCase();
  if (["4","LEGENDARY"].includes(n)) return "LEGENDARY";
  if (["3","EPIC"].includes(n)) return "EPIC";
  if (["2","RARE"].includes(n)) return "RARE";
  if (["1","COMMON"].includes(n)) return "COMMON";
  return (["COMMON","RARE","EPIC","LEGENDARY"].includes(n) ? n : "COMMON");
}
function rarityIcons(r) {
  const n = rarityName(r);
  if (n === "LEGENDARY") return " ★★★★";
  if (n === "EPIC")      return " ★★★";
  if (n === "RARE")      return " ★★";
  return " ★";
}
function pickUsd(x) {
  const val = x?.usdPrice ?? x?.priceUsd ?? x?.price_usd ?? x?.priceUSD ?? null;
  if (val == null) return "";
  const num = Number(val);
  if (Number.isNaN(num)) return "";
  return `$${num.toFixed(num >= 100 ? 0 : 2)}`;
}
function short(x = "") {
  if (!x || typeof x !== "string") return "";
  return x.length > 10 ? `${x.slice(0,6)}…${x.slice(-4)}` : x;
}
function keyFor(p) {
  return p?.id || `${p?.contractAddress || "x"}-${p?.tokenId || p?.name || Math.random()}`;
}

/* ---- UI small components ---- */

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

function PackSmall({ pack }) {
  const name = pack?.name || pack?.collectionName || "Pack";
  const img = pack?.image || pack?.metadata?.image || "";
  const link = pack?.url || pack?.metadata?.url || "https://vibechain.com/market";
  const isVerified = pack?.metadata?.verified === true;

  return (
    <a className="card row" href={link} target="_blank" rel="noreferrer">
      {img ? (
        <img className="thumb" alt="" src={img} />
      ) : (
        <div className="thumb" />
      )}
      <div className="grow">
        <div className="title truncate" style={{display:"flex",alignItems:"center",gap:6}}>
          {name}
          {isVerified && (
            <img
              alt="verified"
              src="https://vibechain.com/api/proxy?url=https%3A%2F%2Fwieldcd.net%2Fcdn-cgi%2Fimage%2Ffit%3Dcontain%2Cf%3Dauto%2Cw%3D168%2Fhttps%253A%252F%252Fvibechain.com%252Fvibemarket%252Fassets%252Ficons%252Fseal1.png"
              style={{width:12,height:12}}
            />
          )}
        </div>
        <div className="muted">View</div>
      </div>
    </a>
  );
}

function QuickBuy({ token }) {
  const isSet = !!token;
  const href = isSet
    ? `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${token}&chain=base`
    : "#";
  return (
    <div className="card">
      <div className="meta">
        <div className="title">Quick Buy</div>
        <div className="sub">{isSet ? short(token) : "Set NEXT_PUBLIC_QUICK_TOKEN"}</div>
      </div>
      <a className={`btn ${!isSet ? "disabled":""}`} href={href} target="_blank" rel="noreferrer">Open Uniswap</a>
    </div>
  );
}

function Placeholder({ text }) {
  return <div className="card">{text}</div>;
}

/* -------- For Trade (local list + optional import from holdings) ---------- */

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
    if (!wallet) return alert("Connect wallet first.");
    setImporting(true);
    try {
      const res = await wieldFetch(`vibe/owner/${wallet}?chainId=${CHAIN_ID}`);
      const holdings = res?.holdings || res?.cards || [];
      const mapped = holdings.map(h => ({
        id: `${h.contract || h.address}-${h.tokenId || h.id}-${Math.random()}`,
        name: h.name || h.series || "Item",
        rarity: rarityName(h.rarity),
        contract: h.contract || h.address || "",
        tokenId: h.tokenId || h.id || "",
        notes: ""
      }));
      setItems(prev => dedupeById([...prev, ...mapped]));
    } catch {
      alert("Could not import from /vibe/owner/:address (endpoint not open). Add manually for now.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div className="panel-title">For Trade (wallet-to-wallet – v1 local list)</div>
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
        {!items.length ? <div className="card">No items in your trade list yet.</div> :
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
