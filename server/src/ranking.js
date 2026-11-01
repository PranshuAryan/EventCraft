import { ask, logAiFailure } from "./ai.js";
import { PROMPT_LIMITS } from "./config.js";
import { RANK_SYSTEM_PROMPT } from "./prompts.js";
import { keepKnownIds, repairJson, sanitize } from "./utils.js";

const FALLBACK_SCORE = 50;

/**
 * Ranks vendors against the user's preferences with AI.
 * If the AI fails, every vendor gets a neutral score so the list still works.
 * @returns {Promise<Array<{id: string, score: number, reason: string}>>}
 */
export async function rank(places, preferences) {
  try {
    const summary = places.map(({ id, name, category, rating, distanceKm, priceLevel }) => ({
      id,
      name,
      category,
      rating,
      distanceKm,
      priceLevel,
    }));
    const raw = await ask([
      { role: "system", content: RANK_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${JSON.stringify(summary)}\n<user_input>${sanitize(preferences, PROMPT_LIMITS.rankPreferences)}</user_input>`,
      },
    ]);
    return keepKnownIds(repairJson(raw).ranked, places);
  } catch (error) {
    logAiFailure("rank", error, 200);
    return places.map((p) => ({
      id: p.id,
      score: FALLBACK_SCORE,
      reason: "Nearest match (AI ranking unavailable).",
    }));
  }
}
