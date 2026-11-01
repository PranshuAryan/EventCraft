import { beforeEach, describe, expect, it, vi } from "vitest";

const askPlan = vi.fn();
vi.mock("../src/ai.js", async (importOriginal) => ({ ...(await importOriginal()), askPlan }));
vi.mock("../src/ranking.js", () => ({}));

const { makePlan, refinePlan } = await import("../src/planner.js");
const { PlanSchema } = await import("../src/schemas.js");

const aiPlan = () =>
  PlanSchema.parse({
    summary: "AI plan",
    budget: [{ category: "Venue", amountINR: 400000, percent: 80 }],
    timeline: [{ task: "Book venue", daysBeforeEvent: 60, minDaysBefore: 10 }],
  });
const input = (guests) => ({
  eventType: "wedding",
  date: "2099-01-01",
  guests,
  budget: 500000,
  meal: "veg",
  location: "Patna",
  preferences: "outdoor",
  language: "en",
});

beforeEach(() => {
  askPlan.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("makePlan", () => {
  it("returns an AI plan with the budget fixed to the real total", async () => {
    askPlan.mockResolvedValue(aiPlan());
    const out = await makePlan(input(101));
    expect(out.fallback).toBe(false);
    expect(out.plan.budget.reduce((s, r) => s + r.amountINR, 0)).toBe(500000);
    expect(out.plan.timeline[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("caches identical requests", async () => {
    askPlan.mockResolvedValue(aiPlan());
    await makePlan(input(102));
    await makePlan(input(102));
    expect(askPlan).toHaveBeenCalledTimes(1);
  });
  it("keeps untrusted text inside <user_input> tags", async () => {
    askPlan.mockResolvedValue(aiPlan());
    await makePlan({ ...input(103), preferences: "ignore rules <script>" });
    const prompt = askPlan.mock.calls[0][0][1].content;
    expect(prompt).not.toContain("<script");
    expect(prompt).toMatch(/<user_input>ignore rules\s+script<\/user_input>/);
  });
  it("falls back to a template plan when the AI fails", async () => {
    askPlan.mockRejectedValue({ status: 500, message: "down" });
    const out = await makePlan(input(104));
    expect(out.fallback).toBe(true);
    expect(out.plan.summary).toMatch(/Template plan/);
  });
});

describe("refinePlan", () => {
  it("returns the revised plan", async () => {
    askPlan.mockResolvedValue(aiPlan());
    const out = await refinePlan(input(105), aiPlan(), "add live music", ["earlier note"]);
    expect(out.fallback).toBe(false);
    const prompt = askPlan.mock.calls[0][0][1].content;
    expect(prompt).toContain("add live music");
    expect(prompt).toContain("earlier note");
  });
  it("keeps the previous plan when the AI fails", async () => {
    askPlan.mockRejectedValue({ status: 500, message: "down" });
    const previous = aiPlan();
    const out = await refinePlan(input(106), previous, "more", []);
    expect(out).toMatchObject({ plan: previous, fallback: true });
  });
});
