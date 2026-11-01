/**
 * Central place for tunable values, so no "magic numbers" are scattered through the code.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** HTTP server */
export const DEFAULT_PORT = 4000;
export const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";

/** Maximum JSON body sizes, by route. Larger limits are only for routes that need them. */
export const BODY_LIMITS = { default: "20kb", refine: "100kb", data: "150kb" };

/** Rate limits. `windowMs` is the time window, `limit` the allowed requests per client. */
export const RATE_LIMITS = {
  global: { windowMs: 15 * MINUTE, limit: 300 },
  auth: { windowMs: 15 * MINUTE, limit: 20 },
  ai: { windowMs: MINUTE, limit: 10 },
};

/** Sessions */
export const SESSION = { cookieName: "ec_session", maxAgeSeconds: 7 * 24 * 3600 };

/** Cache lifetimes, in seconds */
export const CACHE_TTL = {
  default: HOUR / 1000,
  autocomplete: (5 * MINUTE) / 1000,
  reverseGeocode: DAY / 1000,
  places: DAY / 1000,
};

/** Geoapify (maps, geocoding, places) */
export const GEOAPIFY = {
  baseUrl: "https://api.geoapify.com",
  autocompleteLimit: 8,
  placesLimit: 20,
  minQueryLength: 3,
  maxQueryLength: 100,
};

/** Maps our vendor categories to Geoapify place categories. */
export const PLACE_CATEGORIES = {
  hotel: "accommodation.hotel",
  caterer: "catering.restaurant",
  banquet: "entertainment,accommodation.hotel",
};

/** Human-friendly labels for Geoapify result types. */
export const RESULT_KIND_LABELS = {
  street: "Street",
  suburb: "Area",
  district: "Area",
  neighbourhood: "Area",
  locality: "Area",
  city: "City",
  town: "City",
  village: "City",
  county: "District",
  state: "State",
  postcode: "PIN code",
  amenity: "Place",
  building: "Place",
};

/** Groq (AI) */
export const AI = {
  defaultModel: "llama-3.3-70b-versatile",
  temperature: 0.4,
  maxAttempts: 4,
  retryBaseDelayMs: 500,
  /** Models to try, in order, if the default is not available on the account. */
  preferredModels: [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
  ],
};

/** Maximum lengths for user text that is placed into AI prompts. */
export const PROMPT_LIMITS = { location: 100, preferences: 500, note: 800, rankPreferences: 400 };
