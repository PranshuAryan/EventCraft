import { existsSync, readFileSync } from "node:fs";
import { writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";
/** Small JSON-file user store (no native deps). Pass null as file for an in-memory store (tests). */
export class UserStore {
  constructor(file) {
    this.file = file;
    this.queue = Promise.resolve();
    try {
      this.users = file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
    } catch {
      this.users = [];
    }
  }
  async findById(id) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async create({ name, email, passHash }) {
    if (this.users.some((x) => x.email === email))
      throw Object.assign(new Error("Email taken"), { code: "EMAIL_TAKEN" });
    const user = {
      id: randomUUID(),
      name,
      email,
      passHash,
      createdAt: new Date().toISOString(),
      data: { plan: null, bookings: [] },
    };
    this.users.push(user);
    await this.persist();
    return user;
  }
  async setData(id, data) {
    const u = await this.findById(id);
    if (u) {
      u.data = data;
      await this.persist();
    }
  }
  persist() {
    if (!this.file) return Promise.resolve();
    const tmp = `${this.file}.tmp`;
    this.queue = this.queue
      .then(async () => {
        await writeFile(tmp, JSON.stringify(this.users), { mode: 0o600 });
        await rename(tmp, this.file);
      })
      .catch((e) => console.error("[store] save failed:", e.message));
    return this.queue;
  }
}

/** Redis-backed store (Upstash, over HTTP) for serverless hosting where files do not persist. */
export class RedisUserStore {
  constructor(redis) {
    this.r = redis;
  }
  async findById(id) {
    return (await this.r.get(`user:${id}`)) ?? null;
  }
  async findByEmail(email) {
    const id = await this.r.get(`email:${email}`);
    return id ? this.findById(id) : null;
  }
  async create({ name, email, passHash }) {
    const user = {
      id: randomUUID(),
      name,
      email,
      passHash,
      createdAt: new Date().toISOString(),
      data: { plan: null, bookings: [] },
    };
    // NX makes claiming the email atomic, so two sign-ups cannot take the same address.
    if (!(await this.r.set(`email:${email}`, user.id, { nx: true })))
      throw Object.assign(new Error("Email taken"), { code: "EMAIL_TAKEN" });
    await this.r.set(`user:${user.id}`, user);
    return user;
  }
  async setData(id, data) {
    const u = await this.findById(id);
    if (u) await this.r.set(`user:${id}`, { ...u, data });
  }
}
const USERS_FILE = fileURLToPath(new URL("../data/users.json", import.meta.url));
/** Uses Upstash Redis when its environment variables exist, otherwise a local JSON file. */
export function createStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return new RedisUserStore(new Redis({ url, token }));
  if (process.env.VERCEL)
    console.error(
      "[store] No Redis database is connected, so accounts will NOT be saved. Add the Upstash Redis integration in Vercel.",
    );
  return new UserStore(USERS_FILE);
}
