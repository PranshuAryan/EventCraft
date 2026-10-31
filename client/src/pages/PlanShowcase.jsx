import { useEffect, useState } from "react";
const SCENES = [
  { tag: "Wedding", title: "Priya & Rahul", meta: "150 guests · ₹8,00,000", kind: "budget", rows: [["Venue", 25, "₹2,00,000"], ["Catering", 30, "₹2,40,000"], ["Decor", 12, "₹96,000"], ["Photography", 8, "₹64,000"], ["Attire", 10, "₹80,000"]], foot: "Budget split in seconds" },
  { tag: "Birthday", title: "Aarav's Minecraft party", meta: "40 guests · ₹60,000", kind: "tasks", rows: [["90 days", "Finalize budget and theme"], ["60 days", "Send digital invitations"], ["30 days", "Approve Minecraft design mock-up"], ["7 days", "Send final headcount to caterer"]], foot: "A timeline built around your date" },
  { tag: "Community", title: "Neighbourhood puja", meta: "300 people · ₹1,50,000", kind: "vendors", rows: [["Sample Tent House", "2.1 km", "Fits your budget"], ["Sample Sound & Lights", "3.4 km", "Fits your budget"], ["Sample Caterers", "1.8 km", "Ask for a quote"]], foot: "Nearby vendors matched to your budget" },
  { tag: "Event day", kind: "success" },
];
const CONFETTI = Array.from({ length: 22 }, (_, n) => ({ x: (n * 37 + 7) % 96, d: (n % 7) * 0.1, c: n % 4 }));
const MS = 5200;
export default function PlanShowcase() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(0), [playing, setPlaying] = useState(!reduce);
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SCENES.length), MS);
    return () => clearTimeout(t);
  }, [i, playing]);
  const s = SCENES[i];
  return (
    <div className="show" role="region" aria-label="Examples of event plans">
      <div className="show-top"><span className="live"><i aria-hidden="true" /> Example plan</span><span className="tagchip">{s.tag}</span></div>
      <div className="scene" key={i}>
        {s.kind !== "success" && <><h2 className="st">{s.title}</h2><p className="sm">{s.meta}</p></>}
        {s.kind === "budget" && <ul className="bars">{s.rows.map(([k, p, amt], n) => (
          <li key={k} style={{ "--d": `${0.25 + n * 0.14}s` }}><span>{k}</span><span className="track"><span className="fill" style={{ width: `${p * 3}%` }} /></span><b>{amt}</b></li>))}</ul>}
        {s.kind === "tasks" && <ul className="tasks">{s.rows.map(([d, t], n) => (
          <li key={t} style={{ "--d": `${0.25 + n * 0.8}s` }}><span className="tick" aria-hidden="true">✓</span><span><b>{d}</b> {t}</span></li>))}</ul>}
        {s.kind === "vendors" && <ul className="vend">{s.rows.map(([n, km, b], k) => (
          <li key={n} style={{ "--d": `${0.25 + k * 0.4}s` }}><span><b>{n}</b><small>{km} away</small></span><em>{b}</em></li>))}</ul>}
        {s.kind === "success" && (
          <div className="win">
            <div className="conf" aria-hidden="true">{CONFETTI.map((p, n) => <span key={n} data-c={p.c} style={{ "--x": `${p.x}%`, "--d": `${p.d}s` }} />)}</div>
            <svg aria-hidden="true" className="bigcheck" viewBox="0 0 52 52"><circle cx="26" cy="26" r="23" /><path d="M15 27l8 8 14-16" /></svg>
            <h2 className="st">Event successful</h2>
            <p className="sm">Everything booked, paid and on time.</p>
            <dl className="wins"><div><dt>Tasks done</dt><dd>11 / 11</dd></div><div><dt>Over budget</dt><dd>₹0</dd></div><div><dt>Vendors</dt><dd>9 confirmed</dd></div></dl>
          </div>)}
        {s.foot && <p className="foot">{s.foot}</p>}
      </div>
      <div className="show-foot">
        <div className="dots">{SCENES.map((x, n) => <button key={x.tag} className={n === i ? "on" : ""} aria-label={`Show example ${n + 1} of ${SCENES.length}: ${x.tag}`} aria-current={n === i} onClick={() => setI(n)} />)}</div>
        <button className="pp" onClick={() => setPlaying(!playing)}>{playing ? "Pause" : "Play"}</button>
      </div>
    </div>
  );
}
