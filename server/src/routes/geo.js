import express from "express";
import { GEOAPIFY } from "../config.js";
import { autocomplete, findPlaces, reverse } from "../geo.js";
import { PlacesQuery } from "../schemas.js";
import { asyncHandler, fail, isValidCoordinate, ok, validate } from "../http.js";

/** Location search and vendor lookup. Geocoding failures never break the UI: they return empty results. */
export function geoRouter() {
  const router = express.Router();

  router.get("/geocode/autocomplete", async (req, res) => {
    const text = String(req.query.text ?? "").slice(0, GEOAPIFY.maxQueryLength);
    if (text.length < GEOAPIFY.minQueryLength) return ok(res, []);

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const near = isValidCoordinate(lat, lng) ? { lat, lng } : undefined;
    try {
      return ok(res, await autocomplete(text, near));
    } catch {
      return ok(res, []);
    }
  });

  router.get("/geocode/reverse", async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!isValidCoordinate(lat, lng)) return fail(res, 400, "Invalid coordinates");
    try {
      return ok(res, await reverse(lat, lng));
    } catch {
      return ok(res, { label: null });
    }
  });

  router.get(
    "/places",
    validate(PlacesQuery, "query"),
    asyncHandler(async (req, res) => ok(res, await findPlaces(req.valid))),
  );

  return router;
}
