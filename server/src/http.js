/** Small helpers that keep every API response in the same `{ ok, data, error }` shape. */

/** Sends a successful response. */
export const ok = (res, data, status = 200) =>
  res.status(status).json({ ok: true, data, error: null });

/** Sends an error response. */
export const fail = (res, status, error) =>
  res.status(status).json({ ok: false, data: null, error });

/** Turns Zod issues into one readable message. */
export function formatIssues(issues, { withPath = true } = {}) {
  return issues
    .map((issue) => (withPath ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}

/**
 * Express middleware that validates `req[source]` against a Zod schema.
 * On success the parsed value is available as `req.valid`.
 */
export const validate = (schema, source) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return fail(res, 400, formatIssues(result.error.issues));
  req.valid = result.data;
  return next();
};

/** Lets async route handlers throw: any error is passed on to Express' error handler. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

/** True when latitude and longitude are numbers inside their valid ranges. */
export const isValidCoordinate = (lat, lng) => Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
