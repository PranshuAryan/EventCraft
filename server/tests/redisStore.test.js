import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { RedisUserStore, createStore, UserStore } from "../src/userStore.js";
import { getSecret } from "../src/auth.js";
class FakeRedis {
  m = new Map();
  async get(k) {
    return this.m.has(k) ? structuredClone(this.m.get(k)) : null;
  }
  async set(k, v, o) {
    if (o?.nx && this.m.has(k)) return null;
    this.m.set(k, structuredClone(v));
    return "OK";
  }
}
const reg = (a, e = "asha@example.com") =>
  a.post("/api/auth/register").send({ name: "Asha", email: e, password: "password123" });
describe("Redis user store (fake Redis)", () => {
  const app = () => createApp({ store: new RedisUserStore(new FakeRedis()), secret: "t" });
  it("registers, logs in again and rejects a duplicate email", async () => {
    const a = app(),
      s = request.agent(a);
    expect((await reg(s)).status).toBe(201);
    expect((await reg(request.agent(a), "asha@example.com")).status).toBe(409);
    expect(
      (
        await request(a)
          .post("/api/auth/login")
          .send({ email: "asha@example.com", password: "password123" })
      ).status,
    ).toBe(200);
  });
  it("keeps each person's data separate", async () => {
    const a = app(),
      x = request.agent(a),
      y = request.agent(a);
    await reg(x);
    await reg(y, "ravi@example.com");
    await x.put("/api/data").send({
      plan: { input: {} },
      bookings: [{ id: "1", vendor: "V", total: "1", paid: "0", status: "Inquiry" }],
    });
    expect((await x.get("/api/data")).body.data.bookings).toHaveLength(1);
    expect((await y.get("/api/data")).body.data.bookings).toHaveLength(0);
  });
  it("two sign-ups racing for one email: only one wins", async () => {
    const store = new RedisUserStore(new FakeRedis());
    const results = await Promise.allSettled(
      [1, 2].map(() => store.create({ name: "A", email: "same@x.com", passHash: "h" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
});
describe("deployment settings", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it("uses Redis when its variables exist, a file store otherwise", () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.KV_REST_API_URL;
    expect(createStore()).toBeInstanceOf(UserStore);
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "t";
    expect(createStore()).toBeInstanceOf(RedisUserStore);
  });
  it("refuses to start in production without a session secret", () => {
    delete process.env.SESSION_SECRET;
    process.env.VERCEL = "1";
    expect(() => getSecret()).toThrow(/SESSION_SECRET/);
  });
  it("allows same-host writes but still blocks other sites", async () => {
    const a = createApp({ store: new UserStore(null), secret: "t" });
    const body = { email: "a@b.com", password: "wrongpass1" };
    expect(
      (
        await request(a)
          .post("/api/auth/login")
          .set("Host", "my-app.vercel.app")
          .set("Origin", "https://my-app.vercel.app")
          .send(body)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(a)
          .post("/api/auth/login")
          .set("Host", "my-app.vercel.app")
          .set("Origin", "https://evil.example")
          .send(body)
      ).status,
    ).toBe(403);
  });
});
