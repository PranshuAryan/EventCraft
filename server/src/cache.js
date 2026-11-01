import NodeCache from "node-cache";
import { CACHE_TTL } from "./config.js";

/** Shared in-memory cache for geocoding, places and generated plans. */
export const cache = new NodeCache({ stdTTL: CACHE_TTL.default, checkperiod: 600 });

/** Returns the cached value for `key`, or computes, stores and returns it. */
export async function cached(key, ttlSeconds, compute) {
  if (cache.has(key)) return cache.get(key);
  const value = await compute();
  cache.set(key, value, ttlSeconds);
  return value;
}
