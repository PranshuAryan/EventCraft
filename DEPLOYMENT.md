# Deploying EventCraft on Vercel

EventCraft runs on Vercel as one project: the React app is served as static files, and the Express API runs as a single serverless function (`api/index.js`). `vercel.json` connects them.

Accounts and saved plans live in a free **Upstash Redis** database. Vercel's file system is read-only and temporary, so the local `users.json` file cannot be used there.

## Before you start

- A free [GitHub](https://github.com) account and a free [Vercel](https://vercel.com) account (sign in to Vercel with GitHub).
- Your Groq and Geoapify keys (see the README).
- Run `npm install` once locally after updating, then `npm test`, to confirm everything passes.

## 1. Put the project on GitHub

1. Create a new **empty** repository on GitHub (no README).
2. In the `eventcraft` folder, run:
   ```bash
   git init
   git add .
   git commit -m "EventCraft"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/eventcraft.git
   git push -u origin main
   ```
3. Check on GitHub that `server/.env` is **not** there. It is listed in `.gitignore`, so it should not be. If your keys were ever uploaded, delete them in the Groq and Geoapify dashboards and create new ones.

## 2. Import the project in Vercel

1. In Vercel, choose **Add New, then Project**, and pick the repository.
2. Leave **Root Directory** as the repository root. The build settings come from `vercel.json`, so you do not need to change them.
3. Before pressing **Deploy**, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `GROQ_API_KEY` | your Groq key |
| `GEOAPIFY_API_KEY` | your Geoapify key |
| `SESSION_SECRET` | a long random string (see below) |

   To make a secret, run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the result. The app refuses to start on Vercel without it.

4. Press **Deploy**.

## 3. Add the database

1. Open the deployed project, go to **Storage**, and create a database from the **Marketplace** with **Upstash Redis**. Choose the free plan and a region close to your users, then connect it to the project.
2. Vercel adds the database variables for you (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or the older `KV_REST_API_URL` and `KV_REST_API_TOKEN`). The app reads either pair.
3. **Redeploy** (Deployments, the latest one, Redeploy) so the function picks up the variables.

## 4. Check that it works

1. Open `https://YOUR-PROJECT.vercel.app/api/health`. You should see `{"ok":true,...}`.
2. Open the site, create an account, build a plan, and log out and back in. Your plan should still be there.
3. In **Logs** on Vercel, look for the line `[store] No Redis database is connected`. If it appears, step 3 was not completed.

## Common problems

| Symptom | Likely cause and fix |
|---|---|
| The API page shows an error about `SESSION_SECRET` | Add the variable in Vercel settings and redeploy. |
| Sign-up works but you are logged out on the next page, or the account disappears | No Redis database is connected. Complete step 3 and redeploy. |
| The site opens but `/api/...` returns the home page or 404 | `vercel.json` is missing from the repository root, or Root Directory is not the repo root. |
| AI plan stops after about 10 seconds | The function time limit is lower than expected. `vercel.json` asks for 60 seconds. If your plan caps it lower, the deployment log says so. |
| "Origin not allowed" when posting | You are calling the API from a different website. Add that site to `CLIENT_ORIGIN`. Same-site use needs nothing. |
| Plans always fall back to the template | The Groq key is missing or the model is unavailable. Check the function logs for `[plan] AI failed`. |

## Limits to know about

- **Free tiers.** Vercel Hobby, Upstash and the AI and map providers all have usage limits that change over time. Check their pricing pages. The Hobby plan is for personal, non-commercial use.
- **Rate limits and caches are per function instance.** Under heavy traffic, several instances can each allow their own quota, and cached results may be repeated. Fine for a demo, not for a busy site.
- **The AI endpoints do not require login**, so anyone with the link can use up your free Groq quota. Keep the link private until judging, or require login for them.
- **Cold starts.** The first request after a quiet period can be slow.

## Updating the live site

Push to GitHub. Vercel rebuilds automatically. Environment variable changes need a redeploy.

## Alternative: deploy from your computer

```bash
npm install -g vercel
vercel login
vercel          # preview
vercel --prod   # production
```

Add the environment variables and database in the Vercel dashboard as above.
