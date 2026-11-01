import { beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.fn();
vi.mock("../src/ai.js", async (importOriginal) => ({ ...(await importOriginal()), ask: askMock }));

const { rank } = await import("../src/ranking.js");
const places = [
  { id: "a", name: "A", category: "hotel", rating: null, distanceKm: 1, priceLevel: 2 },
  { id: "b", name: "B", category: "hotel", rating: null, distanceKm: 2, priceLevel: null },
];

beforeEach(() => {
  askMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("rank", () => {
  it("keeps only ids we actually sent", async () => {
    askMock.mockResolvedValue(
      JSON.stringify({
        ranked: [
          { id: "a", score: 90, reason: "close" },
          { id: "invented", score: 99 },
        ],
      }),
    );
    const out = await rank(places, "cheap");
    expect(out).toEqual([{ id: "a", score: 90, reason: "close" }]);
  });
  it("gives every place a neutral score when the AI fails", async () => {
    askMock.mockRejectedValue({ status: 500, message: "down" });
    const out = await rank(places, "");
    expect(out.map((r) => r.score)).toEqual([50, 50]);
    expect(out[0].reason).toMatch(/unavailable/);
  });
});
