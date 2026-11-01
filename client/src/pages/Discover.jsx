import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, inr } from "../api.js";
import { useLoc } from "../context.js";
import { budgetInfo, budgetScore, describeFit, TIER_NAMES } from "../vendorFit.js";
const CATEGORY_LABELS = {
  banquet: "Banquets and venues",
  hotel: "Hotels",
  caterer: "Caterers",
  decorator: "Decorators",
  photographer: "Photographers",
};
const DEFAULT_RADIUS_KM = 10;
const RADIUS_OPTIONS_KM = [2, 5, 10, 25];
const DEFAULT_PREFERENCES = "good value for a large family event";

export default function Discover() {
  const { loc, plan } = useLoc();
  const [category, setCategory] = useState("banquet");
  const [places, setPlaces] = useState([]);
  const [ranks, setRanks] = useState({});
  const [status, setStatus] = useState("idle");
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const info = useMemo(() => budgetInfo(plan, category), [plan, category]);
  const preferences = info
    ? `Event: ${info.input.eventType}. ${info.guests} guests. Budget for this: ${inr(info.amount)} (about ${inr(info.perGuest)} per guest), ${TIER_NAMES[info.tier]} tier. Meal: ${info.input.meal}. Prefer places that fit this budget.`
    : DEFAULT_PREFERENCES;
  useEffect(() => {
    if (!loc) return;
    let isActive = true;
    setStatus("loading");
    setRanks({});
    api(`/places?lat=${loc.lat}&lng=${loc.lng}&category=${category}&radius=${radiusKm * 1000}`)
      .then(async (found) => {
        if (!isActive) return;
        setPlaces(found);
        setStatus("done");
        if (!found.length) return;
        const ranked = await api("/rank-vendors", {
          method: "POST",
          body: JSON.stringify({ places: found, preferences }),
        }).catch(() => []);
        if (isActive) setRanks(Object.fromEntries(ranked.map((entry) => [entry.id, entry])));
      })
      .catch(() => isActive && setStatus("error"));
    return () => {
      isActive = false;
    };
  }, [loc, category, preferences, radiusKm]);

  const totalScore = (vendor) => (ranks[vendor.id]?.score ?? 0) + budgetScore(vendor, info);
  const sorted = [...places].sort(
    (a, b) => totalScore(b) - totalScore(a) || a.distanceKm - b.distanceKm,
  );
  return (
    <section className="wrap">
      <h1>Find vendors near you</h1>
      <div role="group" aria-label="Vendor type" className="chips">
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <button
            key={value}
            className={`chip ${category === value ? "on" : ""}`}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p>
        <label className="inline">
          Search within{" "}
          <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
            {RADIUS_OPTIONS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>{" "}
          of {loc ? loc.label.split(",")[0] : "your location"}
        </label>
      </p>
      {info ? (
        <p className="notice">
          Your plan sets aside <strong>{inr(info.amount)}</strong> for this, about{" "}
          {inr(info.perGuest)} per guest, so {TIER_NAMES[info.tier]} options come first. Map data
          rarely lists prices, so always confirm a written quote.
        </p>
      ) : (
        <p className="notice">
          {plan ? (
            "Your plan has no budget line for this vendor type."
          ) : (
            <>
              Build a plan first to see suggestions matched to your budget.{" "}
              <Link to="/plan">Go to the planner</Link>.
            </>
          )}
        </p>
      )}
      {!loc && (
        <p className="notice">
          Set your location with the button in the header to see nearby options.
        </p>
      )}
      <p role="status">
        {status === "loading"
          ? "Searching…"
          : status === "error"
            ? "Could not load vendors. Try again shortly."
            : status === "done" && !places.length
              ? "No vendors found in this area for this category."
              : ""}
      </p>
      <ul className="cards">
        {sorted.map((vendor) => {
          const fit = describeFit(vendor, info);
          return (
            <li key={vendor.id} className="card">
              <h2>
                {vendor.name} {fit && <span className={`badge ${fit.kind}`}>{fit.text}</span>}
              </h2>
              <p className="muted">
                {vendor.address} · {vendor.distanceKm} km away
                {vendor.source === "curated" ? " · sample listing" : ""}
              </p>
              {ranks[vendor.id]?.reason && <p>{ranks[vendor.id].reason}</p>}
              <p>
                {vendor.phone ? (
                  <a href={`tel:${vendor.phone}`}>Call {vendor.phone}</a>
                ) : (
                  "Contact not listed"
                )}{" "}
                ·{" "}
                {vendor.website && (
                  <>
                    <a href={vendor.website} rel="noopener noreferrer" target="_blank">
                      Website
                    </a>{" "}
                    ·{" "}
                  </>
                )}
                <a href={vendor.mapsUrl} rel="noopener noreferrer" target="_blank">
                  Open in Google Maps
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
