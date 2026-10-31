import { lazy, Suspense, useState, useEffect, useRef, createContext, useContext } from "react";
import { NavLink, Route, Routes, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api.js";
import Home from "./pages/Home.jsx";
const Planner = lazy(() => import("./pages/Planner.jsx"));
const Discover = lazy(() => import("./pages/Discover.jsx"));
const Tracker = lazy(() => import("./pages/Tracker.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
export const Loc = createContext(null);
export const useLoc = () => useContext(Loc);
const Pin = () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export function LocationBar() {
  const { loc, setLoc } = useLoc();
  const [q, setQ] = useState(""), [opts, setOpts] = useState([]), [open, setOpen] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => {
    if (q.length < 3) return setOpts([]);
    const ac = new AbortController();
    const t = setTimeout(() => api(`/geocode/autocomplete?text=${encodeURIComponent(q)}${loc ? `&lat=${loc.lat}&lng=${loc.lng}` : ""}`, { signal: ac.signal }).then(setOpts).catch(() => {}), 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, loc]);
  const pick = (o) => { setLoc({ label: o.label, lat: o.lat, lng: o.lng }); setQ(""); setOpts([]); setOpen(false); setMsg(""); };
  const detect = () => {
    if (!navigator.geolocation) return setMsg("Your browser cannot share location. Type your city instead.");
    setMsg("Finding your location…");
    navigator.geolocation.getCurrentPosition(async ({ coords: { latitude: lat, longitude: lng } }) => {
      const r = await api(`/geocode/reverse?lat=${lat}&lng=${lng}`).catch(() => ({ label: null }));
      pick({ label: r.label ?? "Current location", lat, lng });
    }, () => setMsg("Location access was denied. Type your city instead."));
  };
  const name = loc ? loc.label.split(",")[0] : "Set location";
  return (
    <div className="locbar">
      <button className="btn ghost locbtn" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="locpanel" aria-label={loc ? `Location: ${name}. Change location` : "Set location"}><Pin /><span>{name}</span></button>
      {open && (
        <div id="locpanel" className="locpanel" role="group" aria-label="Choose your location" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <button className="btn" onClick={detect}><Pin /> Use my current location</button>
          <p className="or" aria-hidden="true"><span>or</span></p>
          <div className="search">
            <svg aria-hidden="true" className="sicon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <label htmlFor="locq" className="sr">Search for a city, area or street</label>
            <input id="locq" role="combobox" aria-expanded={opts.length > 0} aria-controls="locopts" aria-autocomplete="list" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            <span className="ph" aria-hidden="true" data-hide={q.length > 0}>Search city, area or street</span>
          </div>
          <p className="muted hint">Tip: be specific, like “Saket, Delhi” or “Boring Road, Patna”.</p>
          <ul id="locopts" role="listbox" aria-label="Location suggestions">
            {opts.map((o) => <li key={o.label} role="option" aria-selected="false" tabIndex={0} onClick={() => pick(o)} onKeyDown={(e) => e.key === "Enter" && pick(o)}><Pin /><span className="opt"><b>{o.primary ?? o.label}</b><small>{o.secondary}</small></span>{o.kind && <em className="kind">{o.kind}</em>}</li>)}
          </ul>
          <p role="status" className="muted">{msg}</p>
        </div>
      )}
    </div>
  );
}
function RequireAuth({ children }) {
  const { user } = useLoc();
  const where = useLocation();
  if (user === undefined) return <p role="status" className="wrap">Loading…</p>;
  return user ? children : <Navigate to="/login" replace state={{ from: where.pathname }} />;
}
export function Account() {
  const { user, setUser, saveState } = useLoc();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef(null), btn = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const logout = () => api("/auth/logout", { method: "POST" }).catch(() => {}).finally(() => { setOpen(false); setUser(null); nav("/"); });
  if (!user) return <Link className="btn ghost" to="/login">Log in</Link>;
  const first = user.name.split(" ")[0];
  const problem = saveState.startsWith("Could not");
  return (
    <div className="menu" ref={box} onKeyDown={(e) => { if (e.key === "Escape" && open) { setOpen(false); btn.current?.focus(); } }}>
      <button ref={btn} className="btn ghost menubtn" aria-expanded={open} aria-controls="acctmenu" onClick={() => setOpen(!open)}>
        <span className="avatar" aria-hidden="true">{first[0]?.toUpperCase()}</span>
        <span className="mname">Hi, {first}</span>
        {problem && <span className="sr">(there is a problem saving your data)</span>}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div id="acctmenu" className="menupanel">
          <p className="who"><b>{user.name}</b><span className="muted">{user.email}</span></p>
          <p className={problem ? "error" : "muted"} role="status">{saveState || "Your plans and payments save automatically."}</p>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [loc, setLoc] = useState(() => { try { return JSON.parse(localStorage.getItem("ec_loc")); } catch { return null; } });
  const [user, setUser] = useState(undefined); // undefined = checking, null = logged out
  const [plan, setPlan] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [synced, setSynced] = useState(false);
  const [saveState, setSaveState] = useState("");
  const skip = useRef(false);
  useEffect(() => { try { localStorage.setItem("ec_loc", JSON.stringify(loc)); localStorage.removeItem("ec_plan"); localStorage.removeItem("ec_bookings"); } catch { /* storage unavailable */ } }, [loc]);
  useEffect(() => { api("/auth/me").then((d) => setUser(d.user)).catch(() => setUser(null)); }, []);
  useEffect(() => {
    setSynced(false);
    if (!user) { setPlan(null); setBookings([]); return; }
    let live = true;
    api("/data").then((d) => { if (!live) return; skip.current = true; setPlan(d.plan); setBookings(d.bookings ?? []); setSynced(true); }).catch(() => live && setSaveState("Could not load your saved data"));
    return () => { live = false; };
  }, [user]);
  useEffect(() => {
    if (!synced) return;
    if (skip.current) { skip.current = false; return; }
    setSaveState("Saving…");
    const t = setTimeout(() => api("/data", { method: "PUT", body: JSON.stringify({ plan, bookings }) }).then(() => setSaveState("Saved")).catch(() => setSaveState("Could not save")), 600);
    return () => clearTimeout(t);
  }, [plan, bookings, synced]);
  return (
    <Loc.Provider value={{ loc, setLoc, plan, setPlan, bookings, setBookings, user, setUser, saveState }}>
      <a className="skip" href="#main">Skip to main content</a>
      <header className="top">
        <Link to="/" className="brand">EventCraft</Link>
        <nav aria-label="Main">
          {[["/plan", "Plan"], ["/discover", "Find vendors"], ["/tracker", "Payments"]].map(([to, t]) => <NavLink key={to} to={to}>{t}</NavLink>)}
        </nav>
        <div className="acct"><LocationBar /><Account /></div>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<p role="status" className="wrap">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/plan" element={<RequireAuth><Planner /></RequireAuth>} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/tracker" element={<RequireAuth><Tracker /></RequireAuth>} />
            <Route path="*" element={<section className="wrap"><h1>Page not found</h1><Link to="/">Back to home</Link></section>} />
          </Routes>
        </Suspense>
      </main>
      <footer className="wrap muted">Vendor data comes from Geoapify and a curated sample list. Always confirm details with the vendor.</footer>
    </Loc.Provider>
  );
}
