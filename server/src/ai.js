import Groq from "groq-sdk";
import { AI } from "./config.js";
import { REPAIR_SYSTEM_PROMPT } from "./prompts.js";
import { PlanSchema } from "./schemas.js";
import { chooseModel, repairJson } from "./utils.js";

let activeModel = null;

const groqClient = () =>
  process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Logs why an AI call failed, without ever printing secrets. */
export function logAiFailure(tag, error, maxLength = 300) {
  console.error(
    `[${tag}] AI failed:`,
    error.status ?? "",
    String(error.message).slice(0, maxLength),
  );
}

/** Short reason shown to the user outside production, to help debugging. */
export const failReason = (error) =>
  process.env.NODE_ENV === "production"
    ? undefined
    : `${error.status ?? ""} ${String(error.message)}`.slice(0, 400);

/**
 * Sends chat messages to Groq and returns the raw text reply.
 * Retries rate-limited calls with backoff, and switches model once if the model is missing.
 */
export async function ask(messages) {
  const client = groqClient();
  if (!client) throw new Error("no groq key");

  let model = activeModel ?? process.env.GROQ_MODEL ?? AI.defaultModel;
  let modelDiscovered = false;

  for (let attempt = 0; attempt < AI.maxAttempts; attempt++) {
    try {
      const reply = await client.chat.completions.create({
        model,
        temperature: AI.temperature,
        response_format: { type: "json_object" },
        messages,
      });
      activeModel = model;
      return reply.choices[0].message.content;
    } catch (error) {
      if (error.status === 404 && !modelDiscovered) {
        modelDiscovered = true;
        const ids = (await client.models.list()).data.map((m) => m.id);
        model = chooseModel(ids);
        if (!model) throw new Error("No usable chat model on this Groq account");
        console.log("[ai] switching to", model);
        continue;
      }
      const isLastAttempt = attempt === AI.maxAttempts - 1;
      if (error.status !== 429 || isLastAttempt) throw error;
      await sleep(AI.retryBaseDelayMs * 2 ** attempt);
    }
  }
}

/** Asks for a plan and validates it. If the reply is malformed, asks the model to repair it once. */
export async function askPlan(messages) {
  const raw = await ask(messages);
  try {
    return PlanSchema.parse(repairJson(raw));
  } catch (parseError) {
    console.error("[plan] first reply invalid:", String(parseError.message).slice(0, 300));
    const repaired = await ask([
      { role: "system", content: REPAIR_SYSTEM_PROMPT },
      { role: "user", content: raw },
    ]);
    return PlanSchema.parse(repairJson(repaired));
  }
}
