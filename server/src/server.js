import "dotenv/config";
import { createApp } from "./app.js";
const port = process.env.PORT ?? 4000;
if (!process.env.GROQ_API_KEY || !process.env.GEOAPIFY_API_KEY)
  console.warn("Missing API keys: running on fallbacks (template plans, curated vendors).");
createApp().listen(port, () => console.log(`API on :${port}`));
