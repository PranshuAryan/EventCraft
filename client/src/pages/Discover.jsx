import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api.js";
import { useLoc } from "../App.jsx";
const CATS = { banquet: "Banquets and venues", hotel: "Hotels", caterer: "Caterers", decorator: "Decorators", photographer: "Photographers" };
const BUDGET_KEYS = { banquet: ["venue"], hotel: ["venue", "accommodation", "stay"], caterer: ["cater", "food", "meal"], decorator: ["decor"], photographer: ["photo", "video"] };
const TIER = ["", "budget-friendly", "mid-range", "premium"];
const PER_GUEST = { banquet: [600, 1800], hotel: [600, 1800], caterer: [350, 900] };
function tierFor(cat, amount, guests) {
  const per = amount / Math.max(guests, 1), t = PER_GUEST[cat];
  if (t) return per < t[0] ? 1 : per < t[1] ? 2 : 3;
  return amount < 40000 ? 1 : amount < 150000 ? 2 : 3;
}
function budgetInfo(plan, cat) {
  if (!plan?.plan) return null;
  const keys = BUDGET_KEYS[cat];
  const amount = plan.plan.budget.filter((r) => keys.some((k) => r.category.toLowerCase().includes(k))).reduce((a, r) => a + (+r.amountINR || 0), 0);
  if (!amount) return null;
  const guests = +plan.input.guests || 1;
  return { amount, guests, per: Math.round(amount / guests), tier: tierFor(cat, amount, guests), input: plan.input };
}
export default function Discover() {
  const { loc, plan } = useLoc();
  const [cat, setCat] = useState("banquet"), [places, setPlaces] = useState([]), [ranks, setRanks] = useState({}), [state, setState] = useState("idle"), [km, setKm] = useState(10);
  const info = useMemo(() => budgetInfo(plan, cat), [plan, cat]);
  const prefs = info ? `Event: ${info.input.eventType}. ${info.guests} guests. Budget for this: ${inr(info.amount)} (about ${inr(info.per)} per guest), ${TIER[info.tier]} tier. Meal: ${info.input.meal}. Prefer places that fit this budget.` : "good value for a large family event";
  useEffect(() => {
    if (!loc) return;
    let live = true; setState("loading"); setRanks({});
    api(`/places?lat=${loc.lat}&lng=${loc.lng}&category=${cat}&radius=${km * 1000}`).then(async (ps) => {
      if (!live) return; setPlaces(ps); setState("done");
      if (ps.length) { const r = await api("/rank-vendors", { method: "POST", body: JSON.stringify({ places: ps, preferences: prefs }) }).catch(() => []); if (live) setRanks(Object.fromEntries(r.map((x) => [x.id, x]))); }
    }).catch(() => live && setState("error"));
    return () => { live = false; };
  }, [loc, cat, prefs, km]);
  const fit = (p) => (!info ? null : p.priceLevel == null ? { t: "Ask for a quote", k: "ask" } : p.priceLevel === info.tier ? { t: "Fits your budget", k: "fit" } : p.priceLevel < info.tier ? { t: "Under your budget", k: "fit" } : { t: "May exceed your budget", k: "over" });
  const score = (p) => (ranks[p.id]?.score ?? 0) + (info && p.priceLevel != null ? (p.priceLevel <= info.tier ? 20 : -15 * (p.priceLevel - info.tier)) : 0);
  const sorted = [...places].sort((a, b) => score(b) - score(a) || a.distanceKm - b.distanceKm);
  return (
    <section className="wrap">
      <h1>Find vendors near you</h1>
      <div role="group" aria-label="Vendor type" className="chips">{Object.entries(CATS).map(([k, v]) => <button key={k} className={`chip ${cat === k ? "on" : ""}`} aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}</div>
      <p><label className="inline">Search within <select value={km} onChange={(e) => setKm(+e.target.value)}>{[2, 5, 10, 25].map((n) => <option key={n} value={n}>{n} km</option>)}</select> of {loc ? loc.label.split(",")[0] : "your location"}</label></p>
      {info
        ? <p className="notice">Your plan sets aside <strong>{inr(info.amount)}</strong> for this, about {inr(info.per)} per guest, so {TIER[info.tier]} options come first. Map data rarely lists prices, so always confirm a written quote.</p>
        : <p className="notice">{plan ? "Your plan has no budget line for this vendor type." : <>Build a plan first to see suggestions matched to your budget. <Link to="/plan">Go to the planner</Link>.</>}</p>}
      {!loc && <p className="notice">Set your location with the button in the header to see nearby options.</p>}
      <p role="status">{state === "loading" ? "Searching…" : state === "error" ? "Could not load vendors. Try again shortly." : state === "done" && !places.length ? "No vendors found in this area for this category." : ""}</p>
      <ul className="cards">{sorted.map((p) => { const f = fit(p); return (
        <li key={p.id} className="card">
          <h2>{p.name} {f && <span className={`badge ${f.k}`}>{f.t}</span>}</h2>
          <p className="muted">{p.address} · {p.distanceKm} km away{p.source === "curated" ? " · sample listing" : ""}</p>
          {ranks[p.id]?.reason && <p>{ranks[p.id].reason}</p>}
          <p>{p.phone ? <a href={`tel:${p.phone}`}>Call {p.phone}</a> : "Contact not listed"} · {p.website && <><a href={p.website} rel="noopener noreferrer" target="_blank">Website</a> · </>}<a href={p.mapsUrl} rel="noopener noreferrer" target="_blank">Open in Google Maps</a></p>
        </li>); })}</ul>
    </section>
  );
}
