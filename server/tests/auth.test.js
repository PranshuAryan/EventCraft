import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../src/auth.js";
import { UserStore } from "../src/userStore.js";

const SECRET = "test-secret";

describe("passwords", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });
  it("uses a different salt every time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
  it("rejects missing or malformed stored hashes", async () => {
    expect(await verifyPassword("x", undefined)).toBe(false);
    expect(await verifyPassword("x", "no-colon")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a user id", () => {
    expect(verifyToken(signToken("u1", SECRET), SECRET)).toBe("u1");
  });
  it("rejects a token signed with another secret", () => {
    expect(verifyToken(signToken("u1", "other"), SECRET)).toBeNull();
  });
  it("rejects a tampered token", () => {
    const [body, sig] = signToken("u1", SECRET).split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: Date.now() + 1e9 })).toString(
      "base64url",
    );
    expect(verifyToken(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(body).toBeTruthy();
  });
  it("rejects an expired token", () => {
    const old = signToken("u1", SECRET, Date.now() - 8 * 24 * 3600 * 1000);
    expect(verifyToken(old, SECRET)).toBeNull();
  });
  it("rejects garbage", () => {
    expect(verifyToken("", SECRET)).toBeNull();
    expect(verifyToken("abc", SECRET)).toBeNull();
  });
});

describe("account flow over HTTP", () => {
  const app = createApp({ store: new UserStore(null), secret: SECRET, authLimit: 100 });
  const agent = request.agent(app);
  const account = { name: "Asha", email: "Asha@Example.com", password: "longenough1" };

  it("registers, rejects duplicates, and logs in case-insensitively", async () => {
    expect((await agent.post("/api/auth/register").send(account)).status).toBe(201);
    const dup = await request(app)
      .post("/api/auth/register")
      .send({ ...account, email: "asha@example.com" });
    expect(dup.status).toBe(409);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ASHA@example.com", password: account.password });
    expect(login.status).toBe(200);
  });
  it("rejects a wrong password with a generic message", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: account.email, password: "nope-nope" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Incorrect email or password");
  });
  it("rejects a short password and an unknown email the same safe way", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/register")
          .send({ ...account, email: "b@b.com", password: "short" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .send({ email: "ghost@x.com", password: "whatever1" })
      ).status,
    ).toBe(401);
  });
  it("saves and returns data for the logged-in user, and logs out", async () => {
    const data = { plan: null, bookings: [] };
    expect((await agent.put("/api/data").send(data)).body.data.saved).toBe(true);
    expect((await agent.get("/api/data")).body.data).toEqual(data);
    expect((await agent.get("/api/auth/me")).body.data.user.email).toBe("asha@example.com");
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).body.data.user).toBeNull();
  });
  it("sets an HttpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: account.email, password: account.password });
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);
  });
});

describe("UserStore with a file", () => {
  it("persists users to disk and reloads them", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "ec-")), "users.json");
    const store = new UserStore(file);
    const user = await store.create({ name: "A", email: "a@a.com", passHash: "x:y" });
    await store.setData(user.id, { plan: null, bookings: [{ id: "1" }] });
    expect(JSON.parse(readFileSync(file, "utf8"))).toHaveLength(1);
    const reloaded = new UserStore(file);
    expect((await reloaded.findByEmail("a@a.com")).data.bookings).toHaveLength(1);
  });
  it("refuses a duplicate email", async () => {
    const store = new UserStore(null);
    await store.create({ name: "A", email: "a@a.com", passHash: "x:y" });
    await expect(
      store.create({ name: "B", email: "a@a.com", passHash: "x:y" }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });
  it("starts empty when the file is corrupt", () => {
    const dir = mkdtempSync(join(tmpdir(), "ec-"));
    const file = join(dir, "users.json");
    new UserStore(file); // no file yet
    expect(new UserStore(join(dir, "missing.json")).users).toEqual([]);
  });
});
