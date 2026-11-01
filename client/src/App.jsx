import { lazy, Suspense } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Account from "./components/Account.jsx";
import LocationBar from "./components/LocationBar.jsx";
import { Loc, useLoc } from "./context.js";
import { useAccountData } from "./hooks/useAccountData.js";
import { useSavedLocation } from "./hooks/useSavedLocation.js";
import Home from "./pages/Home.jsx";

const Planner = lazy(() => import("./pages/Planner.jsx"));
const Discover = lazy(() => import("./pages/Discover.jsx"));
const Tracker = lazy(() => import("./pages/Tracker.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));

// Re-exported so tests and pages can keep importing these from App.
export { Loc, useLoc, LocationBar, Account };

const NAV_LINKS = [
  { to: "/plan", label: "Plan" },
  { to: "/discover", label: "Find vendors" },
  { to: "/tracker", label: "Payments" },
];

const LoadingMessage = () => (
  <p role="status" className="wrap">
    Loading…
  </p>
);

/** Sends logged-out visitors to the login page, then back to where they were going. */
function RequireAuth({ children }) {
  const { user } = useLoc();
  const where = useLocation();
  if (user === undefined) return <LoadingMessage />;
  return user ? children : <Navigate to="/login" replace state={{ from: where.pathname }} />;
}

const NotFound = () => (
  <section className="wrap">
    <h1>Page not found</h1>
    <Link to="/">Back to home</Link>
  </section>
);

export default function App() {
  const [loc, setLoc] = useSavedLocation();
  const accountData = useAccountData();

  return (
    <Loc.Provider value={{ loc, setLoc, ...accountData }}>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <header className="top">
        <Link to="/" className="brand">
          EventCraft
        </Link>
        <nav aria-label="Main">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="acct">
          <LocationBar />
          <Account />
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<LoadingMessage />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/plan"
              element={
                <RequireAuth>
                  <Planner />
                </RequireAuth>
              }
            />
            <Route path="/discover" element={<Discover />} />
            <Route
              path="/tracker"
              element={
                <RequireAuth>
                  <Tracker />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="wrap muted">
        Vendor data comes from Geoapify and a curated sample list. Always confirm details with the
        vendor.
      </footer>
    </Loc.Provider>
  );
}
