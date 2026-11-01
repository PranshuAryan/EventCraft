# Security

## What we protect

- API keys for Groq and Geoapify.
- Account credentials and sessions.
- Each person's saved plans and payment records.
- The service itself, against abuse of the (rate-limited) AI endpoints.

## Controls in place

### Secrets

- Keys live only in `server/.env`, which is git-ignored. `server/.env.example` has empty placeholders.
- The browser calls our API only. Groq and Geoapify are never called from the client, so no key is in the client bundle.
- The session signing secret comes from `SESSION_SECRET` or is generated and stored in `server/data/.session_secret` (also git-ignored, file mode 0600 where the OS supports it).

### Accounts and sessions

- Passwords are hashed with **scrypt** and a random 16-byte salt, and compared in constant time. Plain passwords are never stored or returned.
- Sessions are HMAC-SHA256 signed tokens with a 7-day expiry, checked in constant time. Forged or tampered tokens are rejected.
- The cookie is `HttpOnly` (not readable by page scripts) and `SameSite=Lax`, plus `Secure` when `NODE_ENV=production`.
- Login errors are generic ("Incorrect email or password"), so they do not reveal which emails exist. Registration does say when an email is already taken, which is a known trade-off for usability.
- Per-user data is looked up from the verified token, never from an id sent by the client, so one person cannot read another's data. This is covered by automated tests.

### Input handling

- Every request body and query is validated with **zod**: types, lengths, ranges, enums, coordinate bounds, dates not in the past, and guests 1 to 5000.
- Request size limits: 20 KB by default, 100 KB for plan refinement, 150 KB for saving data.
- Free text is stripped of control characters and angle brackets and length-capped before it reaches a prompt.

### Prompt injection

- User text is placed inside `<user_input>` tags and the system prompt states that it is data, not instructions.
- The AI's output is never trusted: it is parsed, validated with zod and normalised. Plans have to match the schema, and vendor rankings can only refer to ids we supplied. Unknown ids are dropped.
- AI output is rendered as plain text by React. `dangerouslySetInnerHTML` is not used anywhere.

### Network and abuse protection

- `helmet` sets security headers. CORS allows only origins listed in `CLIENT_ORIGIN`.
- Writes (non-GET requests) that carry an `Origin` header are refused with 403 unless the origin is in that list or is the same host the request was sent to, on top of `SameSite` cookies.
- Rate limits per client address: 300 requests per 15 minutes overall, 10 per minute for AI routes (plan, refine and ranking share this limit), and 20 per 15 minutes for sign-up and login.
- Errors go through one handler that returns a generic message. Stack traces and secrets are never sent to the client (tested).
- `x-powered-by` is disabled.

## Known limitations (be honest about these)

- **Locally, accounts are in a JSON file** (queued, atomic writes, but not a database). When deployed, they are stored in Upstash Redis, and email addresses are claimed atomically so two sign-ups cannot take the same one. Redis free plans are not a substitute for backups.
- **No password reset, email verification or multi-factor login.** There is no account lockout beyond the login rate limit.
- **Rate limits are per server instance and per IP.** On serverless hosting each instance counts separately. `trust proxy` is enabled automatically on Vercel so real client addresses are used.
- **AI endpoints do not require login.** They are rate limited, but a determined abuser could use up the free Groq quota. Requiring login for them is a straightforward next step.
- **In non-production mode, the plan response can include a short technical reason** when the AI fails, to help debugging. Set `NODE_ENV=production` in deployment to hide it.
- **No audit logging or alerting.**
- Dependencies are pinned to exact versions, but `npm audit` should be run before each release and its output reviewed. It has not been run as part of this documentation.

## Reporting a problem

Open an issue on the project repository, or contact the maintainer directly. Please do not post secrets or other people's data in public issues.

## Checklist before deploying

- [ ] `NODE_ENV=production`
- [ ] `SESSION_SECRET` set to a long random value
- [ ] `CLIENT_ORIGIN` set to the real site address only
- [ ] HTTPS enabled, and `trust proxy` configured if behind a proxy
- [ ] Redis database connected (see DEPLOYMENT.md), with backups if the data matters
- [ ] `npm audit` reviewed
- [ ] `.env` and `server/data/*` confirmed absent from the repository

## Security headers and dependencies

- The frontend is served with a Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy (see `vercel.json`). Scripts may only load from the site itself; Google Fonts is the only external source allowed.
- The API sends Helmet's security headers and only returns JSON.
- `npm audit` was run; Express, compression and react-router-dom were updated to patched versions. The remaining Zod advisory needs a breaking major upgrade and concerns very large arrays; request bodies are already capped at 20 to 150 KB, which limits the risk.
