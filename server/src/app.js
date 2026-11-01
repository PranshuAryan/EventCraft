import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter, getSecret, requireAuth } from "./auth.js";
import { BODY_LIMITS, DEFAULT_CLIENT_ORIGIN, RATE_LIMITS } from "./config.js";
import { ok } from "./http.js";
import { errorHandler, limiter, notFound, originGuard } from "./middleware.js";
import { dataRouter } from "./routes/data.js";
import { geoRouter } from "./routes/geo.js";
import { planRouter } from "./routes/plan.js";
import { createStore } from "./userStore.js";

/**
 * Builds the Express app. Everything it needs can be passed in, which keeps tests simple.
 * @param {object} [options]
 * @param {number} [options.aiLimit] AI requests allowed per minute per client
 * @param {number} [options.authLimit] login/signup attempts allowed per 15 minutes per client
 * @param {object} [options.store] user store (Redis, file or in-memory)
 * @param {string} [options.secret] secret used to sign session cookies
 */
export function createApp({
  aiLimit = RATE_LIMITS.ai.limit,
  authLimit = RATE_LIMITS.auth.limit,
  store = createStore(),
  secret = getSecret(),
} = {}) {
  const app = express();
  const origins = (process.env.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGIN).split(",");

  app.disable("x-powered-by");
  // Behind a proxy, trust it so rate limits see the real client address.
  if (process.env.VERCEL || process.env.TRUST_PROXY) app.set("trust proxy", 1);

  app.use(helmet(), compression(), cors({ origin: origins, credentials: true }));
  app.use(originGuard(origins));

  // Routes that need bigger bodies come first, then the small default limit.
  app.use("/api/data", express.json({ limit: BODY_LIMITS.data }));
  app.use("/api/plan/refine", express.json({ limit: BODY_LIMITS.refine }));
  app.use(express.json({ limit: BODY_LIMITS.default }));
  app.use(limiter(RATE_LIMITS.global, "Too many requests. Please slow down."));

  const aiLimiter = limiter(
    { ...RATE_LIMITS.ai, limit: aiLimit },
    "Too many AI requests. Try again in a minute.",
  );
  const authLimiter = limiter(
    { ...RATE_LIMITS.auth, limit: authLimit },
    "Too many attempts. Try again in a few minutes.",
  );

  app.get("/api/health", (_req, res) => ok(res, { status: "up" }));
  app.use("/api/auth", authLimiter, authRouter(store, secret));
  app.use("/api/data", requireAuth(store, secret), dataRouter(store));
  app.use("/api", geoRouter());
  app.use("/api", planRouter(aiLimiter));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
