import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { UserStore } from "../src/userStore.js";

let app;
beforeAll(() => {
  delete process.env.GROQ_API_KEY;
  delete process.env.GEOAPIFY_API_KEY;
  app = createApp({ store: new UserStore(null), secret: "test-secret", aiLimit: 100 });
});

describe("geo routes", () => {
  it("returns an empty list for very short search text", async () => {
    const res = await request(app).get("/api/geocode/autocomplete?text=ab");
    expect(res.body).toEqual({ ok: true, data: [], error: null });
  });
  it("returns an empty list instead of failing when Geoapify is unavailable", async () => {
    const res = await request(app).get("/api/geocode/autocomplete?text=patna");
    expect(res.body.data).toEqual([]);
  });
  it("rejects invalid coordinates for reverse geocoding", async () => {
    const res = await request(app).get("/api/geocode/reverse?lat=999&lng=0");
    expect(res.status).toBe(400);
  });
  it("returns a null label when reverse geocoding is unavailable", async () => {
    const res = await request(app).get("/api/geocode/reverse?lat=25.5&lng=85.1");
    expect(res.body.data).toEqual({ label: null });
  });
  it("validates the places query", async () => {
    const res = await request(app).get("/api/places?lat=25&lng=85&category=nonsense");
    expect(res.status).toBe(400);
  });
  it("serves curated vendors without an API key", async () => {
    const res = await request(app).get("/api/places?lat=25.6&lng=85.1&category=hotel");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("AI routes without an API key", () => {
  it("rank-vendors still answers with neutral scores", async () => {
    const places = [{ id: "a", name: "A" }];
    const res = await request(app).post("/api/rank-vendors").send({ places, preferences: "" });
    expect(res.body.data).toEqual([expect.objectContaining({ id: "a", score: 50 })]);
  });
  it("refine rejects a plan that is not valid", async () => {
    const input = {
      eventType: "wedding",
      date: "2099-01-01",
      guests: 10,
      budget: 1000,
      location: "x",
    };
    const res = await request(app)
      .post("/api/plan/refine")
      .send({ input, plan: {}, notes: "more please" });
    expect(res.status).toBe(400);
  });
});

describe("app basics", () => {
  it("answers health checks", async () => {
    expect((await request(app).get("/api/health")).body.data.status).toBe("up");
  });
  it("returns 404 in the standard shape", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
  it("requires login for saved data", async () => {
    expect((await request(app).get("/api/data")).status).toBe(401);
  });
  it("does not advertise the framework", async () => {
    expect((await request(app).get("/api/health")).headers["x-powered-by"]).toBeUndefined();
  });
});
