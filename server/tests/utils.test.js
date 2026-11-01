import { describe, expect, it } from "vitest";
import {
  chooseModel,
  daysUntil,
  haversine,
  isoDate,
  normalizeBudget,
  sanitize,
  scheduleTimeline,
  timeWarning,
} from "../src/utils.js";

const NOW = new Date(2026, 0, 1);

describe("daysUntil / isoDate", () => {
  it("counts whole days and never goes negative", () => {
    expect(daysUntil("2026-01-11", NOW)).toBe(10);
    expect(daysUntil("2025-12-01", NOW)).toBe(0);
  });
  it("returns Infinity when there is no date", () => {
    expect(daysUntil("", NOW)).toBe(Infinity);
  });
  it("formats dates as YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 2, 5))).toBe("2026-03-05");
  });
});

describe("timeWarning", () => {
  it("warns when less than 30 days remain", () => {
    expect(timeWarning("2026-01-06", NOW)).toHaveLength(1);
  });
  it("is silent when there is plenty of time", () => {
    expect(timeWarning("2026-06-01", NOW)).toEqual([]);
  });
});

describe("scheduleTimeline", () => {
  const tasks = [
    { ideal: 0, task: "Event day", min: 0 },
    { ideal: 90, task: "Plan budget", min: 14 },
  ];
  it("keeps ideal lead times when there is enough time, sorted earliest first", () => {
    const out = scheduleTimeline(tasks, "2026-06-01", NOW);
    expect(out.map((t) => t.daysBeforeEvent)).toEqual([90, 0]);
    expect(out[0].rush).toBe(false);
    expect(out[1].whenLabel).toBe("Day of event");
  });
  it("compresses tasks and flags rush when time is short", () => {
    const out = scheduleTimeline(tasks, "2026-01-11", NOW);
    expect(out[0].daysBeforeEvent).toBeLessThanOrEqual(10);
    expect(out[0].rush).toBe(true);
    expect(out[0].priority).toBe("high");
  });
  it("works without an event date", () => {
    const out = scheduleTimeline(tasks, "", NOW);
    expect(out.every((t) => t.dueDate === "")).toBe(true);
  });
});

describe("normalizeBudget", () => {
  it("scales rows so they add up to the total", () => {
    const rows = [
      { category: "a", amountINR: 50 },
      { category: "b", amountINR: 30 },
    ];
    const out = normalizeBudget(rows, 100);
    expect(out.reduce((sum, r) => sum + r.amountINR, 0)).toBe(100);
    expect(out.every((r) => typeof r.percent === "number")).toBe(true);
  });
  it("leaves rows alone when already close to the total", () => {
    const rows = [{ category: "a", amountINR: 100 }];
    expect(normalizeBudget(rows, 100)).toBe(rows);
  });
  it("returns the input for empty or invalid totals", () => {
    expect(normalizeBudget([], 100)).toEqual([]);
    const rows = [{ category: "a", amountINR: 10 }];
    expect(normalizeBudget(rows, 0)).toBe(rows);
  });
});

describe("haversine", () => {
  it("measures Patna to Delhi at roughly 800-960 km", () => {
    const km = haversine(25.5941, 85.1376, 28.6139, 77.209);
    expect(km).toBeGreaterThan(800);
    expect(km).toBeLessThan(960);
  });
  it("is zero for the same point", () => {
    expect(haversine(10, 10, 10, 10)).toBe(0);
  });
});

describe("chooseModel", () => {
  it("prefers a known good model", () => {
    expect(chooseModel(["x", "llama-3.3-70b-versatile"])).toBe("llama-3.3-70b-versatile");
  });
  it("skips non-chat models when picking a fallback", () => {
    expect(chooseModel(["whisper-large", "some-chat-model"])).toBe("some-chat-model");
  });
  it("returns null when nothing is usable", () => {
    expect(chooseModel(["whisper-large"])).toBeNull();
  });
});

describe("sanitize", () => {
  it("removes angle brackets and control characters", () => {
    const out = sanitize("<b>hi</b>\u0007");
    expect(out).not.toMatch(/[<>]/);
    expect(out).not.toContain("\u0007");
  });
  it("truncates and trims", () => {
    expect(sanitize("  abcdef  ", 4)).toBe("ab");
    expect(sanitize(null)).toBe("");
  });
});
