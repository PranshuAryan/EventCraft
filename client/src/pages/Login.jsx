import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api.js";
import { useLoc } from "../App.jsx";
export default function Login() {
  const { setUser } = useLoc();
  const nav = useNavigate();
  const where = useLocation();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  const signup = mode === "signup";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = signup ? f : { email: f.email, password: f.password };
      const d = await api(`/auth/${signup ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setUser(d.user);
      nav(where.state?.from ?? "/plan", { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wrap auth">
      <div className="authcard">
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {signup
            ? "Your plans and payments are saved to your account only."
            : "Log in to see your saved plans and payments."}
        </p>
        <div role="group" aria-label="Account action" className="chips">
          <button
            type="button"
            className={`chip ${!signup ? "on" : ""}`}
            aria-pressed={!signup}
            onClick={() => {
              setMode("login");
              setErr("");
            }}
          >
            Log in
          </button>
          <button
            type="button"
            className={`chip ${signup ? "on" : ""}`}
            aria-pressed={signup}
            onClick={() => {
              setMode("signup");
              setErr("");
            }}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="stack" noValidate={false}>
          {signup && (
            <label>
              Your name
              <input
                required
                maxLength={60}
                autoComplete="name"
                value={f.name}
                onChange={set("name")}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              value={f.email}
              onChange={set("email")}
            />
          </label>
          <label>
            Password
            <input
              type={show ? "text" : "password"}
              required
              minLength={signup ? 8 : 1}
              maxLength={100}
              autoComplete={signup ? "new-password" : "current-password"}
              aria-describedby="pwhint"
              value={f.password}
              onChange={set("password")}
            />
          </label>
          <span id="pwhint" className="muted">
            {signup ? "At least 8 characters." : ""}
          </span>
          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />{" "}
            Show password
          </label>
          <p role="alert" className="error">
            {err}
          </p>
          <button className="btn" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </section>
  );
}
