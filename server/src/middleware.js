import rateLimit from "express-rate-limit";
import { fail } from "./http.js";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/** Rate limiter that answers with our standard error shape. */
export const limiter = ({ windowMs, limit }, error) =>
  rateLimit({ windowMs, limit, message: { ok: false, data: null, error } });

const isSameHost = (req) => {
  try {
    const requestHost = req.headers["x-forwarded-host"] ?? req.headers.host;
    return new URL(req.headers.origin).host === requestHost;
  } catch {
    return false;
  }
};

/**
 * Blocks cross-site writes (defence in depth on top of SameSite cookies).
 * Same-host requests and allowed origins are always fine.
 */
export const originGuard = (allowedOrigins) => (req, res, next) => {
  const { origin } = req.headers;
  const isWrite = !SAFE_METHODS.includes(req.method);
  if (isWrite && origin && !allowedOrigins.includes(origin) && !isSameHost(req)) {
    return fail(res, 403, "Origin not allowed");
  }
  return next();
};

/** Final error handler: never leaks internal details to the client. */
// Express recognises error handlers by their four parameters, so `_next` must stay.
export const errorHandler = (err, _req, res, _next) =>
  err.type === "entity.too.large"
    ? fail(res, 413, "Request too large")
    : fail(res, 500, "Something went wrong");

export const notFound = (_req, res) => fail(res, 404, "Not found");
