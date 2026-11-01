import { readFileSync } from "node:fs";
import { cached } from "./cache.js";
import { CACHE_TTL, GEOAPIFY, PLACE_CATEGORIES, RESULT_KIND_LABELS } from "./config.js";
import { haversine, mapsUrl } from "./utils.js";

/** Vendors we ship with, used when Geoapify is unavailable or returns nothing. */
const curatedVendors = JSON.parse(
  readFileSync(new URL("../data/curatedVendors.json", import.meta.url), "utf8"),
);

const apiKey = () => process.env.GEOAPIFY_API_KEY;

/** Calls Geoapify. `path` must already contain a query string. */
async function geoFetch(path) {
  if (!apiKey()) throw new Error("no geoapify key");
  const response = await fetch(`${GEOAPIFY.baseUrl}${path}&apiKey=${apiKey()}`);
  if (!response.ok) throw new Error(`geoapify ${response.status}`);
  return response.json();
}

/**
 * Suggests locations in India for the text the user is typing.
 * @param {string} text what the user typed
 * @param {{lat: number, lng: number}} [near] optional point to rank results around
 * @returns {Promise<Array<{label, primary, secondary, kind, lat, lng}>>}
 */
export function autocomplete(text, near) {
  const nearKey = near ? near.lat.toFixed(1) + near.lng.toFixed(1) : "";
  const key = `ac:${text.toLowerCase()}:${nearKey}`;

  return cached(key, CACHE_TTL.autocomplete, async () => {
    const bias = near ? `&bias=proximity:${near.lng},${near.lat}` : "";
    const query =
      `/v1/geocode/autocomplete?text=${encodeURIComponent(text)}` +
      `&filter=countrycode:in&limit=${GEOAPIFY.autocompleteLimit}&lang=en&format=json${bias}`;
    const { results = [] } = await geoFetch(query);

    const seen = new Set();
    return results
      .filter((r) => r.formatted && !seen.has(r.formatted) && seen.add(r.formatted))
      .map((r) => ({
        label: r.formatted,
        primary: r.address_line1 ?? r.name ?? r.formatted,
        secondary: r.address_line2 ?? "",
        kind: RESULT_KIND_LABELS[r.result_type] ?? "Place",
        lat: r.lat,
        lng: r.lon,
      }));
  });
}

/**
 * Turns coordinates into a short place name such as "Patna, Bihar".
 * @returns {Promise<{label: string|null}>}
 */
export function reverse(lat, lng) {
  const key = `rv:${lat.toFixed(3)}:${lng.toFixed(3)}`;

  return cached(key, CACHE_TTL.reverseGeocode, async () => {
    const data = await geoFetch(`/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json`);
    const place = data.results?.[0];
    const area = place?.city ?? place?.town ?? place?.village ?? place?.suburb ?? place?.county;
    const label = [area, place?.state].filter(Boolean).join(", ") || place?.formatted || null;
    return { label };
  });
}

/** Converts a Geoapify feature into our vendor shape. */
function toVendor(feature, category, lat, lng) {
  const p = feature.properties;
  return {
    id: `g_${p.place_id}`,
    name: p.name,
    category,
    address: p.formatted,
    lat: p.lat,
    lng: p.lon,
    phone: p.contact?.phone ?? null,
    website: p.website ?? null,
    rating: null,
    priceLevel: null,
    distanceKm: haversine(lat, lng, p.lat, p.lon),
    source: "geoapify",
    mapsUrl: mapsUrl(p.name, p.lat, p.lon),
  };
}

async function searchGeoapify({ lat, lng, category, radius }) {
  const placeCategory = PLACE_CATEGORIES[category];
  if (!placeCategory) return [];
  const query =
    `/v2/places?categories=${placeCategory}&filter=circle:${lng},${lat},${radius}` +
    `&bias=proximity:${lng},${lat}&limit=${GEOAPIFY.placesLimit}`;
  const { features = [] } = await geoFetch(query);
  return features.filter((f) => f.properties.name).map((f) => toVendor(f, category, lat, lng));
}

function searchCurated({ lat, lng, category }) {
  return curatedVendors
    .filter((vendor) => vendor.category === category)
    .map((vendor) => ({
      ...vendor,
      distanceKm: haversine(lat, lng, vendor.lat, vendor.lng),
      source: "curated",
      mapsUrl: mapsUrl(vendor.name, vendor.lat, vendor.lng),
    }));
}

/**
 * Finds vendors near a point. Uses Geoapify, and falls back to our curated list
 * if Geoapify fails or returns nothing.
 */
export function findPlaces(query) {
  const { lat, lng, category, radius } = query;
  const key = `pl:${lat.toFixed(2)}:${lng.toFixed(2)}:${category}:${radius}`;

  return cached(key, CACHE_TTL.places, async () => {
    let places = [];
    try {
      places = await searchGeoapify(query);
    } catch {
      // Network or key problem: fall through to curated data.
    }
    return places.length ? places : searchCurated(query);
  });
}
