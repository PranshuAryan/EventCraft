import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { fallbackPlan, repairJson, keepKnownIds, SPLITS } from "../src/utils.js";
const app = createApp({ aiLimit: 3 });
const body = { eventType: "wedding", date: "2999-01-01", guests: 150, budget: 800000, location: "Patna" };
describe("utils", () => {
  it("template budgets sum to total", () => { for (const t of Object.keys(SPLITS)) { const p = fallbackPlan({ eventType: t, budget: 500000, guests: 50 }); expect(Math.abs(p.budget.reduce((a, b) => a + b.amountINR, 0) - 500000)).toBeLessThan(10); } });
  it("repairs fenced json with trailing commas", () => expect(repairJson('```json\n{"a":1,}\n```')).toEqual({ a: 1 }));
  it("drops unknown ids from AI ranking", () => expect(keepKnownIds([{ id: "x" }, { id: "fake" }], [{ id: "x" }])).toEqual([{ id: "x" }]));
});
describe("api", () => {
  it("health", async () => expect((await request(app).get("/api/health")).body.ok).toBe(true));
  it("rejects bad input with 400", async () => expect((await request(app).post("/api/plan").send({ ...body, guests: -1 })).status).toBe(400));
  it("rejects past dates", async () => expect((await request(app).post("/api/plan").send({ ...body, date: "2000-01-01" })).status).toBe(400));
  it("returns fallback plan without keys", async () => { const r = await request(app).post("/api/plan").send(body); expect(r.body.data.fallback).toBe(true); });
  it("falls back to curated places without keys", async () => { const r = await request(app).get("/api/places?lat=25.6&lng=85.1&category=banquet"); expect(r.body.data[0].source).toBe("curated"); });
  it("rejects oversized body", async () => expect((await request(app).post("/api/plan").send({ ...body, preferences: "x".repeat(30000) })).status).toBe(413));
  it("hides stack traces and secrets", async () => { const r = await request(app).get("/api/nope"); expect(JSON.stringify(r.body)).not.toMatch(/stack|KEY/i); });
  it("rate limits AI routes", async () => { let s; for (let i = 0; i < 6; i++) s = (await request(app).post("/api/plan").send(body)).status; expect(s).toBe(429); });
});
