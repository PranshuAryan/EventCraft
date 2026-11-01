import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, isNil } from "../src/utils.js";

describe("isNil", () => {
  it("is true only for null and undefined", () => {
    expect([null, undefined].every(isNil)).toBe(true);
    expect([0, "", false, NaN].some(isNil)).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats an ISO date for India", () => {
    expect(formatDate("2026-12-05")).toMatch(/5 Dec 2026/);
  });
  it("returns an empty string for a missing date", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(undefined)).toBe("");
  });
});

describe("daysUntil", () => {
  const inDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  it("counts days to a future date", () => {
    expect(daysUntil(inDays(10))).toBe(10);
  });
  it("never returns a negative number", () => {
    expect(daysUntil(inDays(-5))).toBe(0);
  });
});
