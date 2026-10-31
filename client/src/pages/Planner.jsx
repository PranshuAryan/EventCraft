import { useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api.js";
import { useLoc } from "../App.jsx";
const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const daysLeft = (d) => Math.max(Math.round((new Date(`${d}T00:00:00`) - new Date().setHours(0, 0, 0, 0)) / 864e5), 0);
export default function Planner() {
  const { loc, plan, setPlan } = useLoc();
  const [f, setF] = useState({ eventType: "wedding", date: "", guests: 100, budget: 500000, meal: "veg", preferences: "", language: "en" });
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const [more, setMore] = useState(""), [busy2, setBusy2] = useState(false), [rerr, setRerr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try { setPlan({ input: f, ...(await api("/plan", { method: "POST", body: JSON.stringify({ ...f, guests: +f.guests, budget: +f.budget, location: loc?.label ?? "India" }) })) }); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function refine(e) {
    e.preventDefault(); setBusy2(true); setRerr("");
    try {
      const d = await api("/plan/refine", { method: "POST", body: JSON.stringify({ input: { ...plan.input, guests: +plan.input.guests, budget: +plan.input.budget, location: loc?.label ?? "India" }, plan: plan.plan, notes: more, history: plan.notes ?? [] }) });
      if (d.fallback) return setRerr(`The AI could not update your plan right now, so nothing was changed. Your details are still in the box. ${d.reason ?? ""}`);
      setPlan({ ...plan, plan: d.plan, fallback: false, reason: undefined, prev: { plan: plan.plan }, version: (plan.version ?? 1) + 1, notes: [...(plan.notes ?? []), more].slice(-10) });
      setMore("");
    } catch (x) { setRerr(x.message); } finally { setBusy2(false); }
  }
  const undo = () => setPlan({ ...plan, plan: plan.prev.plan, prev: null, version: Math.max((plan.version ?? 2) - 1, 1), notes: (plan.notes ?? []).slice(0, -1) });
  const p = plan?.plan;
  const sum = p?.budget.reduce((a, b) => a + b.amountINR, 0) ?? 0;
  return (
    <section className="wrap">
      <h1>Plan your event</h1>
      <form onSubmit={submit} className="form" aria-describedby="err">
        <label>Event type<select value={f.eventType} onChange={set("eventType")}><option value="wedding">Wedding</option><option value="birthday">Birthday</option><option value="community">Community event</option></select></label>
        <label>Date<input type="date" required value={f.date} min={new Date().toISOString().slice(0, 10)} onChange={set("date")} /></label>
        <label>Guests<input type="number" min="1" max="5000" required value={f.guests} onChange={set("guests")} /></label>
        <label>Total budget (INR)<input type="number" min="1000" required value={f.budget} onChange={set("budget")} /></label>
        <label>Meal<select value={f.meal} onChange={set("meal")}><option value="veg">Vegetarian</option><option value="non-veg">Non-vegetarian</option><option value="mixed">Mixed</option></select></label>
        <label>Language<select value={f.language} onChange={set("language")}><option value="en">English</option><option value="hi">हिन्दी</option></select></label>
        <label className="full">Style and preferences<textarea maxLength={500} rows={3} value={f.preferences} onChange={set("preferences")} placeholder="Traditional Bihari rituals, outdoor lawn, December" /></label>
        <p className="muted full">Location: {loc ? loc.label : "not set. Use the location button above for better suggestions."}</p>
        <button className="btn" disabled={busy}>{busy ? "Building your plan…" : "Build my plan"}</button>
        <p id="err" role="alert" className="error">{err}</p>
      </form>
      {p && (
        <div className="plan" aria-live="polite">
          <h2>Your plan {plan.version > 1 && <span className="badge ask">Version {plan.version}</span>}</h2>
          <p>{p.summary}</p>
          {p.changes?.length > 0 && <div className="notice"><b>What changed in this version</b><ul>{p.changes.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
          {plan.fallback && <p className="notice">AI was unavailable, so this is a standard template plan.{plan.reason && <> Reason: {plan.reason}</>}</p>}
          {Math.abs(sum - plan.input.budget) > plan.input.budget * 0.02 && <p role="alert" className="error">Category amounts add up to {inr(sum)}, not your budget of {inr(plan.input.budget)}.</p>}
          <h3>Budget</h3>
          <table><caption className="sr">Budget by category</caption><thead><tr><th scope="col">Category</th><th scope="col">Share</th><th scope="col">Amount</th></tr></thead>
            <tbody>{p.budget.map((b) => <tr key={b.category}><th scope="row">{b.category}</th><td><span className="bar" style={{ width: `${b.percent * 2}px` }} aria-hidden="true" /> {b.percent}%</td><td>{inr(b.amountINR)}</td></tr>)}</tbody></table>
          <h3>Timeline</h3>
          <p className="muted">{daysLeft(plan.input.date)} days until your event on {fmt(plan.input.date)}. Dates below are calculated from today.</p>
          <ol className="tl">{p.timeline.map((t, i) => <li key={i}><b>{fmt(t.dueDate)}</b> · {t.whenLabel}: {t.task}{t.rush && <strong className="error"> (Rush: book as soon as possible)</strong>}</li>)}</ol>
          <h3>Vendor checklist</h3>
          {p.vendorChecklist.map((v) => <details key={v.vendorType}><summary>{v.vendorType} · about {inr(v.estimatedCostINR)}</summary><p>Ask: {v.whatToAsk.join("; ")}</p><p>Confirm: {v.mustConfirm.join("; ")}</p></details>)}
          {Object.entries(p.ideas).some(([, v]) => v.length) && <><h3>Ideas</h3>{Object.entries(p.ideas).filter(([, v]) => v.length).map(([k, v]) => <p key={k}><b>{k}:</b> {v.join(", ")}</p>)}</>}
          <form className="refine" onSubmit={refine} aria-labelledby="refh">
            <h3 id="refh">Make this plan better</h3>
            {p.questions?.length > 0 && <><p className="muted">Tap a question to answer it, or add your own details:</p>
              <ul className="qs">{p.questions.map((q) => <li key={q}><button type="button" className="chip" onClick={() => setMore((m) => `${m ? `${m}\n` : ""}${q} `)}>{q}</button></li>)}</ul></>}
            <label htmlFor="more">Tell us more about your event</label>
            <textarea id="more" rows={4} maxLength={800} value={more} onChange={(e) => setMore(e.target.value)} placeholder="Chief guest is coming, 20 children under 10, we want a gaming corner, no loud music after 9pm…" />
            <p><button className="btn" disabled={busy2 || more.trim().length < 3}>{busy2 ? "Improving your plan…" : "Improve my plan"}</button> {plan.prev && <button type="button" className="btn ghost" onClick={undo}>Undo last improvement</button>}</p>
            <p role="alert" className="error">{rerr}</p>
          </form>
          <p><Link className="btn" to="/discover">Find vendors near you</Link> <button className="btn ghost" onClick={() => window.print()}>Print plan</button></p>
        </div>
      )}
    </section>
  );
}
