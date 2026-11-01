import { describe, expect, it } from "vitest";
import { budgetInfo, budgetScore, describeFit, tierFor } from "../src/vendorFit.js";

const savedPlan = {
  input: { guests: 100, eventType: "wedding", meal: "veg" },
  plan: {
    budget: [
      { category: "Catering", amountINR: 50000 },
      { category: "Venue", amountINR: 200000 },
    ],
  },
};

describe("tierFor", () => {
  it("uses per-guest limits for caterers", () => {
    expect(tierFor("caterer", 20000, 100)).toBe(1);
    expect(tierFor("caterer", 50000, 100)).toBe(2);
    expect(tierFor("caterer", 100000, 100)).toBe(3);
  });
  it("uses total amount for other vendors", () => {
    expect(tierFor("photographer", 10000, 100)).toBe(1);
    expect(tierFor("photographer", 100000, 100)).toBe(2);
    expect(tierFor("photographer", 500000, 100)).toBe(3);
  });
});

describe("budgetInfo", () => {
  it("sums matching budget rows and finds the tier", () => {
    const info = budgetInfo(savedPlan, "caterer");
    expect(info).toMatchObject({ amount: 50000, guests: 100, perGuest: 500, tier: 2 });
  });
  it("returns null without a plan or a matching row", () => {
    expect(budgetInfo(null, "caterer")).toBeNull();
    expect(budgetInfo(savedPlan, "decorator")).toBeNull();
  });
});

describe("describeFit / budgetScore", () => {
  const info = { tier: 2 };
  it("describes fit relative to the budget tier", () => {
    expect(describeFit({ priceLevel: null }, info).kind).toBe("ask");
    expect(describeFit({ priceLevel: 2 }, info).kind).toBe("fit");
    expect(describeFit({ priceLevel: 1 }, info).text).toBe("Under your budget");
    expect(describeFit({ priceLevel: 3 }, info).kind).toBe("over");
    expect(describeFit({ priceLevel: 3 }, null)).toBeNull();
  });
  it("rewards fitting vendors and penalises expensive ones", () => {
    expect(budgetScore({ priceLevel: 2 }, info)).toBe(20);
    expect(budgetScore({ priceLevel: 3 }, info)).toBe(-15);
    expect(budgetScore({ priceLevel: null }, info)).toBe(0);
    expect(budgetScore({ priceLevel: 3 }, null)).toBe(0);
  });
});
