# EventCraft

An AI event planning assistant for **weddings, birthdays and community events**. Tell it what you are celebrating, where, when, how many guests and what you can spend. It builds a budget, a timeline with real calendar dates, a vendor checklist and personalised ideas, then finds real nearby venues and tracks your bookings and payments.

Built for the Google Virtual PromptWars Hack2Skill hackathon, Challenge 5: _"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."_

## Features

| Area                    | What it does                                                                                                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan**                | Event form (type, date, guests, budget, meal, style, language). The AI returns a budget split, timeline, vendor checklist, ideas and warnings.                                                                             |
| **Date-aware timeline** | Every task gets a real calendar date worked out from today to the event date. If time is short, steps are compressed, the first one is marked "Start today", and tasks with too little vendor notice are flagged **Rush**. |
| **Refine**              | "Make this plan better": add more details or answer the AI's follow-up questions and it revises the plan, lists _what changed_, and asks new questions. Versions are numbered and the last change can be undone.           |
| **Find vendors**        | Real hotels, banquets and caterers near a city, area or street, pulled from Geoapify and ranked by the AI against your budget. Cards show _Fits your budget_, _May exceed your budget_ or _Ask for a quote_.               |
| **Payments**            | Track each vendor's status, agreed amount, amount paid and balance, with totals and an over-budget alert.                                                                                                                  |
| **Accounts**            | Sign up and log in. Each person's plan and payments are saved to their own account.                                                                                                                                        |
| **Location**            | Use your current location or search for a city, area or street.                                                                                                                                                            |
| **Hindi**               | Generated plans can be produced in Hindi. (The menus and buttons are English only for now.)                                                                                                                                |

## Quick start

You need [Node.js](https://nodejs.org) 18 or newer.

**Windows:** double-click `start.bat`. It installs everything on the first run, creates `server/.env`, starts the app and opens your browser.

**Any system:**

```bash
cp server/.env.example server/.env   # then add your keys
npm install
npm run dev                          # client on :5173, API on :4000
```

Open http://localhost:5173.

The app runs without any keys. In that case it shows a template plan and sample vendors, and says so on screen.

### Get the free API keys

1. **Groq** (AI): create a key at [console.groq.com](https://console.groq.com).
2. **Geoapify** (maps and places): create a project at [myprojects.geoapify.com](https://myprojects.geoapify.com).

Check each provider's current free-tier limits, since they change.

### Environment variables (`server/.env`)

| Variable                                             | Required                                | Purpose                                                                                                                                                                       |
| ---------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY`                                       | For AI plans                            | Groq API key.                                                                                                                                                                 |
| `GEOAPIFY_API_KEY`                                   | For real places and location search     | Geoapify API key.                                                                                                                                                             |
| `CLIENT_ORIGIN`                                      | No (default `http://localhost:5173`)    | Comma-separated list of allowed browser origins.                                                                                                                              |
| `PORT`                                               | No (default `4000`)                     | API port.                                                                                                                                                                     |
| `SESSION_SECRET`                                     | **Yes when deployed**; optional locally | Long random string for signing login sessions. Locally, if empty, one is generated and saved in `server/data/.session_secret`. Deployed, the app refuses to start without it. |
| `GROQ_MODEL`                                         | No                                      | Force a specific Groq model. By default the app uses `llama-3.3-70b-versatile`, and if your account cannot use it, it asks Groq which models you have and picks one.          |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | When deployed                           | Added for you by the Vercel Upstash integration. Without them the app uses a local file.                                                                                      |
| `NODE_ENV`                                           | No                                      | Set to `production` when deployed. Turns on `Secure` cookies and hides internal error reasons.                                                                                |

Never commit `.env`. It is already in `.gitignore`.

## Scripts

| Command                   | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `npm run dev`             | Starts the client and the server together.    |
| `npm test`                | Runs the server tests, then the client tests. |
| `npm -w server test`      | Server tests only.                            |
| `npm -w client test`      | Client tests only.                            |
| `npm -w client run build` | Production build of the client.               |

## Project layout

```
eventcraft/
  start.bat, start.sh          one-click launchers
  server/
    src/
      app.js                   Express app: middleware, routes, error handling
      server.js                starts the server
      auth.js                  password hashing, sessions, login routes
      userStore.js             JSON-file user store
      services.js              Groq (plan, refine, rank) and Geoapify (places, search)
      schemas.js               zod schemas for all inputs and AI output
      utils.js                 timeline scheduler, budget maths, JSON repair, helpers
    data/curatedVendors.json   SAMPLE vendors used as a fallback
    tests/                     Vitest + Supertest
  client/
    src/
      App.jsx                  layout, routing, location search, account menu, data sync
      pages/                   Home, PlanShowcase, Planner, Discover, Tracker, Login
      budgetMath.js            payment totals
    tests/                     Vitest + Testing Library + axe
```

## API

All responses use the shape `{ ok, data, error }`.

| Method and path                                 | Auth | Purpose                                         |
| ----------------------------------------------- | ---- | ----------------------------------------------- |
| `GET /api/health`                               | No   | Liveness check.                                 |
| `POST /api/auth/register`                       | No   | Create an account and start a session.          |
| `POST /api/auth/login`                          | No   | Log in.                                         |
| `POST /api/auth/logout`                         | No   | End the session.                                |
| `GET /api/auth/me`                              | No   | Current user, or `null`.                        |
| `GET /api/data`                                 | Yes  | Load the saved plan and bookings.               |
| `PUT /api/data`                                 | Yes  | Save the plan and bookings.                     |
| `GET /api/geocode/autocomplete?text=&lat=&lng=` | No   | City, area and street suggestions.              |
| `GET /api/geocode/reverse?lat=&lng=`            | No   | Place name for coordinates.                     |
| `GET /api/places?lat=&lng=&category=&radius=`   | No   | Nearby places. Falls back to sample vendors.    |
| `POST /api/plan`                                | No   | Generate a plan. Falls back to a template plan. |
| `POST /api/plan/refine`                         | No   | Revise a plan using extra details.              |
| `POST /api/rank-vendors`                        | No   | AI ranking of real places against the budget.   |

## How the data rule works

The AI never supplies venue names, addresses, phone numbers or prices. Places come from Geoapify (or the sample file). The AI only receives those real results and returns ids with a score and a short reason. Any id that was not in the input is discarded.

## Testing

- **Server (40 tests):** validation, template budgets, JSON repair, the date scheduler, budget normalisation, fallbacks when keys are missing, oversized and malformed requests, rate limits, accounts, sessions, forged tokens, cross-origin writes, per-user data separation, the refine endpoint, the Redis account store (with a fake Redis), and deployment settings.
- **Client (19 tests):** payment maths; the plan form and refine panel (success, failure and undo); vendor budget badges and contact fallbacks; payment totals and the over-budget alert; the location search and account menu; and automated accessibility checks (axe) on every page and on both panels.

All external calls are mocked or disabled in tests, so no API quota is used.

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md): putting the app online on Vercel with a free Redis database.
- [ARCHITECTURE.md](ARCHITECTURE.md): how the pieces fit together and why.
- [SECURITY.md](SECURITY.md): threat model and protections.
- [ACCESSIBILITY.md](ACCESSIBILITY.md): what is supported and what is not.

## Known limitations

- **Place data is thin in small towns.** Geoapify uses OpenStreetMap data. Ratings and prices are not available, and phone numbers are often missing (the card then shows "Contact not listed" and a Google Maps link).
- **Decorators and photographers** have no live search yet and show only the sample list. Banquet results use a broad category and can include non-banquet venues.
- **The sample vendors are placeholders.** Replace the entries in `server/data/curatedVendors.json` with real businesses before a demo.
- **Locally, accounts are stored in a JSON file.** When Upstash Redis variables are present (as on Vercel), accounts and plans are stored there instead. See DEPLOYMENT.md.
- **No "forgot password" or email verification.**
- **Menus are not translated to Hindi yet.**
- **Automated accessibility checks cannot test colour contrast or screen reader behaviour.** See ACCESSIBILITY.md.
- **Rate limits and caches are per server instance**, so they are weaker on serverless hosting. Express `trust proxy` is turned on automatically on Vercel.

## Ideas for next steps

Hosted database, Hindi interface, keyword search for decorators and photographers, real sample data per city, email-based password reset, shareable read-only plan links, and Gemini as an alternative model provider behind the existing AI service.

## Code quality

- `npm run lint` runs ESLint (React, hooks and Node rules); `npm run format` runs Prettier.
- `npm run check` runs lint, format check and all tests. GitHub Actions runs the same checks plus the build on every push.
- Server code is split by job: `routes/` (HTTP), `planner.js` and `ranking.js` (AI features), `ai.js` (Groq client with retries), `geo.js` (Geoapify), `config.js` (all tunable values), `http.js` (response and validation helpers).

## Testing

- `npm test` runs all tests (server: Vitest + Supertest, client: Vitest + Testing Library + axe). `npm run coverage` adds a coverage report.
- **127 tests**: 103 server and 24 client. Server statement coverage is about 96%.
- Groq and Geoapify are mocked, so no API keys are needed. Tests cover the failure paths: AI retry on rate limits, switching models, repairing malformed AI replies, template fallback plans, and curated vendors when maps fail.
- Auth tests cover password hashing, tampered or expired session tokens, duplicate emails, and HttpOnly cookies.
