import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import { SESSION } from "./config.js";
import { fail, formatIssues } from "./http.js";
import { RegisterInput, LoginInput } from "./schemas.js";
const scrypt = promisify(_scrypt);
const COOKIE = SESSION.cookieName;
const MAX_AGE = SESSION.maxAgeSeconds;
export function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL || process.env.NODE_ENV === "production")
    throw new Error("SESSION_SECRET must be set when deployed (use a long random string).");
  const f = fileURLToPath(new URL("../data/.session_secret", import.meta.url));
  try {
    if (existsSync(f)) return readFileSync(f, "utf8").trim();
    const s = randomBytes(32).toString("hex");
    writeFileSync(f, s, { mode: 0o600 });
    return s;
  } catch {
    return randomBytes(32).toString("hex");
  }
}
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scrypt(pw, salt, 64)).toString("hex")}`;
}
export async function verifyPassword(pw, stored) {
  const [s, h] = String(stored ?? "").split(":");
  if (!s || !h) return false;
  const calc = await scrypt(pw, Buffer.from(s, "hex"), 64),
    a = Buffer.from(h, "hex");
  return a.length === calc.length && timingSafeEqual(a, calc);
}
export function signToken(uid, secret, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ uid, exp: now + MAX_AGE * 1000 })).toString(
    "base64url",
  );
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}
export function verifyToken(token, secret, now = Date.now()) {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig),
    b = Buffer.from(createHmac("sha256", secret).update(body).digest("base64url"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > now ? p.uid : null;
  } catch {
    return null;
  }
}
const readCookie = (req, name) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1] ?? "";
const flags = () =>
  `HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
const pub = (u) => ({ id: u.id, name: u.name, email: u.email });
export const requireAuth = (store, secret) => async (req, res, next) => {
  try {
    const uid = verifyToken(readCookie(req, COOKIE), secret),
      user = uid && (await store.findById(uid));
    if (!user) return fail(res, 401, "Please log in");
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
};
export function authRouter(store, secret) {
  const r = express.Router();
  const start = (res, user, status = 200) => {
    res.setHeader(
      "Set-Cookie",
      `${COOKIE}=${signToken(user.id, secret)}; Max-Age=${MAX_AGE}; ${flags()}`,
    );
    res.status(status).json({ ok: true, data: { user: pub(user) }, error: null });
  };
  r.post("/register", async (req, res, next) => {
    try {
      const p = RegisterInput.safeParse(req.body);
      if (!p.success) return fail(res, 400, formatIssues(p.error.issues, { withPath: false }));
      const email = p.data.email.toLowerCase();
      if (await store.findByEmail(email))
        return fail(res, 409, "An account with this email already exists");
      try {
        start(
          res,
          await store.create({
            name: p.data.name,
            email,
            passHash: await hashPassword(p.data.password),
          }),
          201,
        );
      } catch (e) {
        if (e.code === "EMAIL_TAKEN")
          return fail(res, 409, "An account with this email already exists");
        throw e;
      }
    } catch (e) {
      next(e);
    }
  });
  r.post("/login", async (req, res, next) => {
    try {
      const p = LoginInput.safeParse(req.body);
      if (!p.success) return fail(res, 400, formatIssues(p.error.issues, { withPath: false }));
      const user = await store.findByEmail(p.data.email.toLowerCase());
      if (!(await verifyPassword(p.data.password, user?.passHash)) || !user)
        return fail(res, 401, "Incorrect email or password");
      start(res, user);
    } catch (e) {
      next(e);
    }
  });
  r.post("/logout", (_q, res) => {
    res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${flags()}`);
    res.json({ ok: true, data: null, error: null });
  });
  r.get("/me", async (req, res, next) => {
    try {
      const uid = verifyToken(readCookie(req, COOKIE), secret),
        u = uid && (await store.findById(uid));
      res.json({ ok: true, data: { user: u ? pub(u) : null }, error: null });
    } catch (e) {
      next(e);
    }
  });
  return r;
}
