import { createHash } from "node:crypto";
import { askPlan, failReason, logAiFailure } from "./ai.js";
import { cache } from "./cache.js";
import { PROMPT_LIMITS } from "./config.js";
import { PLAN_SYSTEM_PROMPT, REFINE_SUFFIX } from "./prompts.js";
import {
  daysUntil,
  fallbackPlan,
  normalizeBudget,
  sanitize,
  scheduleTimeline,
  timeWarning,
} from "./utils.js";

/** Describes the event in one line for the AI prompt. */
const describeEvent = (input) =>
  `Event: ${input.eventType} in ${sanitize(input.location, PROMPT_LIMITS.location)} on ${input.date} ` +
  `(${daysUntil(input.date)} days from today). Guests: ${input.guests}. Budget INR: ${input.budget}. ` +
  `Meal: ${input.meal}. Language: ${input.language === "hi" ? "Hindi" : "English"}.`;

/** Wraps untrusted user text so the model treats it as data, not instructions. */
const userData = (text, max) => `<user_input>${sanitize(text, max)}</user_input>`;

/** Fixes the budget total and converts ideal lead times into real calendar dates. */
function finishPlan(plan, input) {
  const tasks = plan.timeline.map((t) => ({
    task: t.task,
    ideal: t.daysBeforeEvent,
    min: t.minDaysBefore,
    category: t.category,
    priority: t.priority,
  }));
  return {
    ...plan,
    budget: normalizeBudget(plan.budget, input.budget),
    timeline: scheduleTimeline(tasks, input.date),
    warnings: [...plan.warnings, ...timeWarning(input.date)],
  };
}

/**
 * Creates an event plan with AI. Falls back to a template plan if the AI is unavailable.
 * @returns {Promise<{plan: object, fallback: boolean, reason?: string}>}
 */
export async function makePlan(input) {
  const key = "plan:" + createHash("sha256").update(JSON.stringify(input)).digest("hex");
  if (cache.has(key)) return cache.get(key);

  try {
    const plan = await askPlan([
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Plan this. ${describeEvent(input)}\n${userData(input.preferences, PROMPT_LIMITS.preferences)}`,
      },
    ]);
    const result = { plan: finishPlan(plan, input), fallback: false };
    cache.set(key, result);
    return result;
  } catch (error) {
    logAiFailure("plan", error);
    return { plan: fallbackPlan(input), fallback: true, reason: failReason(error) };
  }
}

/**
 * Updates an existing plan using extra details from the user.
 * If the AI fails, the previous plan is returned unchanged.
 */
export async function refinePlan(input, previous, notes, history) {
  const earlier = history.map((h) => sanitize(h, PROMPT_LIMITS.note)).join("\n---\n");
  const content = [
    `Existing plan JSON: ${JSON.stringify(previous)}`,
    "",
    describeEvent(input),
    `Original preferences:\n${userData(input.preferences, PROMPT_LIMITS.preferences)}`,
    `Earlier extra details:\n<user_input>${earlier}</user_input>`,
    `New details from the user:\n${userData(notes, PROMPT_LIMITS.note)}`,
  ].join("\n");

  try {
    const plan = await askPlan([
      { role: "system", content: PLAN_SYSTEM_PROMPT + REFINE_SUFFIX },
      { role: "user", content },
    ]);
    return { plan: finishPlan(plan, input), fallback: false };
  } catch (error) {
    logAiFailure("refine", error);
    return { plan: previous, fallback: true, reason: failReason(error) };
  }
}
