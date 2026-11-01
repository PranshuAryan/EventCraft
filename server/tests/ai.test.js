import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
const list = vi.fn();
vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create } };
    models = { list };
  },
}));

const { ask, askPlan, failReason, logAiFailure } = await import("../src/ai.js");
const msgs = [{ role: "user", content: "hi" }];
const text = (content) => ({ choices: [{ message: { content } }] });

beforeEach(() => {
  create.mockReset();
  list.mockReset();
  process.env.GROQ_API_KEY = "test-key";
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("ask", () => {
  it("throws without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(ask(msgs)).rejects.toThrow("no groq key");
  });
  it("returns the model's text", async () => {
    create.mockResolvedValue(text("hello"));
    expect(await ask(msgs)).toBe("hello");
  });
  it("retries when rate limited", async () => {
    create
      .mockRejectedValueOnce({ status: 429, message: "slow down" })
      .mockResolvedValueOnce(text("ok"));
    expect(await ask(msgs)).toBe("ok");
    expect(create).toHaveBeenCalledTimes(2);
  });
  it("switches model when the current one is missing", async () => {
    create
      .mockRejectedValueOnce({ status: 404, message: "gone" })
      .mockResolvedValueOnce(text("ok"));
    list.mockResolvedValue({ data: [{ id: "openai/gpt-oss-20b" }] });
    expect(await ask(msgs)).toBe("ok");
    expect(create.mock.calls[1][0].model).toBe("openai/gpt-oss-20b");
  });
  it("fails clearly when the account has no usable model", async () => {
    create.mockRejectedValue({ status: 404, message: "gone" });
    list.mockResolvedValue({ data: [{ id: "whisper-large" }] });
    await expect(ask(msgs)).rejects.toThrow("No usable chat model");
  });
  it("does not retry other errors", async () => {
    create.mockRejectedValue({ status: 401, message: "bad key" });
    await expect(ask(msgs)).rejects.toMatchObject({ status: 401 });
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe("askPlan", () => {
  const goodPlan = JSON.stringify({ summary: "Nice plan", budget: [], timeline: [] });
  it("parses a valid reply", async () => {
    create.mockResolvedValue(text(goodPlan));
    expect((await askPlan(msgs)).summary).toBe("Nice plan");
  });
  it("asks the model to repair a broken reply once", async () => {
    create.mockResolvedValueOnce(text("not json at all")).mockResolvedValueOnce(text(goodPlan));
    expect((await askPlan(msgs)).summary).toBe("Nice plan");
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("failure reporting", () => {
  it("hides details in production and shows them elsewhere", () => {
    const error = { status: 429, message: "limit" };
    process.env.NODE_ENV = "production";
    expect(failReason(error)).toBeUndefined();
    process.env.NODE_ENV = "test";
    expect(failReason(error)).toContain("limit");
  });
  it("logs the tag and reason", () => {
    logAiFailure("plan", { status: 500, message: "oops" });
    expect(console.error).toHaveBeenCalledWith("[plan] AI failed:", 500, "oops");
  });
});
