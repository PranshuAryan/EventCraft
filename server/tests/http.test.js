import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { asyncHandler, fail, formatIssues, isValidCoordinate, ok, validate } from "../src/http.js";
import { errorHandler, notFound, originGuard } from "../src/middleware.js";

const fakeRes = () => {
  const res = { statusCode: 200 };
  res.status = vi.fn((code) => ((res.statusCode = code), res));
  res.json = vi.fn(() => res);
  return res;
};

describe("response helpers", () => {
  it("ok wraps data in the standard shape", () => {
    const res = fakeRes();
    ok(res, { a: 1 });
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { a: 1 }, error: null });
  });
  it("fail wraps an error message and status", () => {
    const res = fakeRes();
    fail(res, 418, "nope");
    expect(res.statusCode).toBe(418);
    expect(res.json).toHaveBeenCalledWith({ ok: false, data: null, error: "nope" });
  });
});

describe("formatIssues / validate", () => {
  const schema = z.object({ n: z.number() });
  it("formats issues with or without the field path", () => {
    const { error } = schema.safeParse({ n: "x" });
    expect(formatIssues(error.issues)).toMatch(/^n: /);
    expect(formatIssues(error.issues, { withPath: false })).not.toMatch(/^n: /);
  });
  it("passes valid input on with req.valid set", () => {
    const req = { body: { n: 1 } };
    const next = vi.fn();
    validate(schema, "body")(req, fakeRes(), next);
    expect(req.valid).toEqual({ n: 1 });
    expect(next).toHaveBeenCalled();
  });
  it("rejects invalid input with a 400", () => {
    const res = fakeRes();
    const next = vi.fn();
    validate(schema, "body")({ body: { n: "x" } }, res, next);
    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("asyncHandler", () => {
  it("forwards thrown errors to next", async () => {
    const next = vi.fn();
    const boom = new Error("boom");
    await asyncHandler(async () => {
      throw boom;
    })({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});

describe("isValidCoordinate", () => {
  it("accepts real coordinates and rejects bad ones", () => {
    expect(isValidCoordinate(25.5, 85.1)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 0)).toBe(false);
  });
});

describe("originGuard", () => {
  const guard = originGuard(["http://localhost:5173"]);
  const run = (req) => {
    const res = fakeRes();
    const next = vi.fn();
    guard({ headers: {}, ...req }, res, next);
    return { res, next };
  };
  it("blocks cross-site writes", () => {
    const { res, next } = run({
      method: "POST",
      headers: { origin: "https://evil.example", host: "app.test" },
    });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
  it("allows reads from anywhere", () => {
    expect(
      run({ method: "GET", headers: { origin: "https://evil.example" } }).next,
    ).toHaveBeenCalled();
  });
  it("allows writes from an allowed origin", () => {
    const headers = { origin: "http://localhost:5173" };
    expect(run({ method: "POST", headers }).next).toHaveBeenCalled();
  });
  it("allows same-host writes", () => {
    const headers = { origin: "https://app.test", host: "app.test" };
    expect(run({ method: "POST", headers }).next).toHaveBeenCalled();
  });
});

describe("error handlers", () => {
  it("returns 413 for oversized bodies and 500 otherwise, without leaking details", () => {
    const big = fakeRes();
    errorHandler({ type: "entity.too.large" }, {}, big, () => {});
    expect(big.statusCode).toBe(413);
    const other = fakeRes();
    errorHandler(new Error("secret detail"), {}, other, () => {});
    expect(other.statusCode).toBe(500);
    expect(JSON.stringify(other.json.mock.calls)).not.toMatch(/secret detail/);
  });
  it("notFound returns 404", () => {
    const res = fakeRes();
    notFound({}, res);
    expect(res.statusCode).toBe(404);
  });
});
