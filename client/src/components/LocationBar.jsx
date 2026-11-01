import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useLoc } from "../context.js";
import { PinIcon, SearchIcon } from "./Icons.jsx";

const MIN_QUERY_LENGTH = 3;
const SEARCH_DELAY_MS = 300;

/** Header button that opens a panel to detect or search for the user's location. */
export default function LocationBar() {
  const { loc, setLoc } = useLoc();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const optionRefs = useRef([]);

  // Look up suggestions shortly after the user stops typing.
  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH) return setSuggestions([]);
    const controller = new AbortController();
    const nearby = loc ? `&lat=${loc.lat}&lng=${loc.lng}` : "";
    const timer = setTimeout(() => {
      api(`/geocode/autocomplete?text=${encodeURIComponent(query)}${nearby}`, {
        signal: controller.signal,
      })
        .then(setSuggestions)
        .catch(() => {});
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, loc]);

  const chooseLocation = (place) => {
    setLoc({ label: place.label, lat: place.lat, lng: place.lng });
    setQuery("");
    setSuggestions([]);
    setActiveIndex(-1);
    setIsOpen(false);
    setMessage("");
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      return setMessage("Your browser cannot share location. Type your city instead.");
    }
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        const found = await api(`/geocode/reverse?lat=${lat}&lng=${lng}`).catch(() => ({
          label: null,
        }));
        chooseLocation({ label: found.label ?? "Current location", lat, lng });
      },
      () => setMessage("Location access was denied. Type your city instead."),
    );
  };

  const focusOption = (index) => {
    const last = suggestions.length - 1;
    const next = Math.max(0, Math.min(index, last));
    setActiveIndex(next);
    optionRefs.current[next]?.focus();
  };

  /** Arrow keys move through suggestions; Escape closes the panel. */
  const handlePanelKeys = (event) => {
    if (event.key === "Escape") return setIsOpen(false);
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(activeIndex - 1);
    }
  };

  const shortName = loc ? loc.label.split(",")[0] : "Set location";

  return (
    <div className="locbar">
      <button
        className="btn ghost locbtn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="locpanel"
        aria-label={loc ? `Location: ${shortName}. Change location` : "Set location"}
      >
        <PinIcon />
        <span>{shortName}</span>
      </button>
      {isOpen && (
        <div
          id="locpanel"
          className="locpanel"
          role="group"
          aria-label="Choose your location"
          onKeyDown={handlePanelKeys}
        >
          <button className="btn" onClick={detectLocation}>
            <PinIcon /> Use my current location
          </button>
          <p className="or" aria-hidden="true">
            <span>or</span>
          </p>
          <div className="search">
            <SearchIcon />
            <label htmlFor="locq" className="sr">
              Search for a city, area or street
            </label>
            <input
              id="locq"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="locopts"
              aria-autocomplete="list"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(-1);
              }}
              autoComplete="off"
            />
            <span className="ph" aria-hidden="true" data-hide={query.length > 0}>
              Search city, area or street
            </span>
          </div>
          <p className="muted hint">
            Tip: be specific, like “Saket, Delhi” or “Boring Road, Patna”.
          </p>
          <ul id="locopts" role="listbox" aria-label="Location suggestions">
            {suggestions.map((place, index) => (
              <li
                key={place.label}
                ref={(element) => (optionRefs.current[index] = element)}
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={0}
                onFocus={() => setActiveIndex(index)}
                onClick={() => chooseLocation(place)}
                onKeyDown={(event) => event.key === "Enter" && chooseLocation(place)}
              >
                <PinIcon />
                <span className="opt">
                  <b>{place.primary ?? place.label}</b>
                  <small>{place.secondary}</small>
                </span>
                {place.kind && <em className="kind">{place.kind}</em>}
              </li>
            ))}
          </ul>
          <p role="status" className="muted">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
