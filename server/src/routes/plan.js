import express from "express";
import { asyncHandler, fail, ok, validate } from "../http.js";
import { makePlan, refinePlan } from "../planner.js";
import { rank } from "../ranking.js";
import { PlanInput, PlanSchema, RankInput, RefineInput } from "../schemas.js";

/** AI-powered routes. `aiLimiter` is shared so all of them count against one limit. */
export function planRouter(aiLimiter) {
  const router = express.Router();

  router.post(
    "/plan",
    aiLimiter,
    validate(PlanInput, "body"),
    asyncHandler(async (req, res) => ok(res, await makePlan(req.valid))),
  );

  router.post(
    "/plan/refine",
    aiLimiter,
    validate(RefineInput, "body"),
    asyncHandler(async (req, res) => {
      const { input, plan, notes, history } = req.valid;
      const previous = PlanSchema.safeParse(plan);
      const hasBudget = Array.isArray(plan.budget) && plan.budget.length > 0;
      if (!previous.success || !hasBudget) return fail(res, 400, "plan: not a valid plan");
      return ok(res, await refinePlan(input, previous.data, notes, history));
    }),
  );

  router.post(
    "/rank-vendors",
    aiLimiter,
    validate(RankInput, "body"),
    asyncHandler(async (req, res) => ok(res, await rank(req.valid.places, req.valid.preferences))),
  );

  return router;
}
