import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { PlanInput, PlanSchema, RefineInput, PlacesQuery, RankInput, DataInput } from "./schemas.js";
import { autocomplete, findPlaces, makePlan, refinePlan, rank, reverse } from "./services.js";
import { createStore } from "./userStore.js";
import { authRouter, requireAuth, getSecret } from "./auth.js";
const ok = (res, data) => res.json({ ok: true, data, error: null });
const validate = (schema, src) => (req, res, next) => {
  const r = schema.safeParse(req[src]);
  if (!r.success) return res.status(400).json({ ok: false, data: null, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  req.valid = r.data; next();
};
export function createApp({ aiLimit = 10, authLimit = 20, store = createStore(), secret = getSecret() } = {}) {
  const app = express();
  const origins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173").split(",");
  app.disable("x-powered-by");
  if (process.env.VERCEL || process.env.TRUST_PROXY) app.set("trust proxy", 1); // so rate limits see the real client address behind a proxy
  app.use(helmet(), compression(), cors({ origin: origins, credentials: true }));
  // Block cross-site writes (defence in depth on top of SameSite cookies). Same-host requests are always fine.
  const sameHost = (req) => { try { return new URL(req.headers.origin).host === (req.headers["x-forwarded-host"] ?? req.headers.host); } catch { return false; } };
  app.use((req, res, next) => (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin) && !sameHost(req) ? res.status(403).json({ ok: false, data: null, error: "Origin not allowed" }) : next()));
  app.use("/api/data", express.json({ limit: "150kb" }));
  app.use("/api/plan/refine", express.json({ limit: "100kb" }));
  app.use(express.json({ limit: "20kb" }));
  app.use(rateLimit({ windowMs: 15 * 60_000, limit: 300 }));
  const limited = (windowMs, limit, error) => rateLimit({ windowMs, limit, message: { ok: false, data: null, error } });
  const ai = limited(60_000, aiLimit, "Too many AI requests. Try again in a minute.");
  app.get("/api/health", (_q, res) => ok(res, { status: "up" }));
  app.use("/api/auth", limited(15 * 60_000, authLimit, "Too many attempts. Try again in a few minutes."), authRouter(store, secret));
  const auth = requireAuth(store, secret);
  app.get("/api/data", auth, (req, res) => ok(res, req.user.data));
  app.put("/api/data", auth, validate(DataInput, "body"), async (req, res, next) => { try { await store.setData(req.user.id, req.valid); ok(res, { saved: true }); } catch (e) { next(e); } });
  app.get("/api/geocode/autocomplete", async (req, res) => {
    const t = String(req.query.text ?? "").slice(0, 100);
    if (t.length < 3) return ok(res, []);
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    try { ok(res, await autocomplete(t, Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined)); } catch { ok(res, []); }
  });
  app.get("/api/geocode/reverse", async (req, res) => {
    const lat = Number(req.query.lat), lng = Number(req.query.lng);
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return res.status(400).json({ ok: false, data: null, error: "Invalid coordinates" });
    try { ok(res, await reverse(lat, lng)); } catch { ok(res, { label: null }); }
  });
  app.get("/api/places", validate(PlacesQuery, "query"), async (req, res, next) => { try { ok(res, await findPlaces(req.valid)); } catch (e) { next(e); } });
  app.post("/api/plan", ai, validate(PlanInput, "body"), async (req, res, next) => { try { ok(res, await makePlan(req.valid)); } catch (e) { next(e); } });
  app.post("/api/plan/refine", ai, validate(RefineInput, "body"), async (req, res, next) => {
    const prev = PlanSchema.safeParse(req.valid.plan);
    if (!prev.success || !Array.isArray(req.valid.plan.budget) || !req.valid.plan.budget.length) return res.status(400).json({ ok: false, data: null, error: "plan: not a valid plan" });
    try { ok(res, await refinePlan(req.valid.input, prev.data, req.valid.notes, req.valid.history)); } catch (e) { next(e); }
  });
  app.post("/api/rank-vendors", ai, validate(RankInput, "body"), async (req, res, next) => { try { ok(res, await rank(req.valid.places, req.valid.preferences)); } catch (e) { next(e); } });
  app.use((_q, res) => res.status(404).json({ ok: false, data: null, error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _q, res, _n) => res.status(err.type === "entity.too.large" ? 413 : 500).json({ ok: false, data: null, error: err.type === "entity.too.large" ? "Request too large" : "Something went wrong" }));
  return app;
}
