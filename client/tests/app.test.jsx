import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
import { bookingTotals, balance } from "../src/budgetMath.js";
import Home from "../src/pages/Home.jsx";
describe("budgetMath", () => {
  const rows = [
    { total: 100, paid: 40, status: "Confirmed" },
    { total: 50, paid: 50, status: "Confirmed" },
    { total: 999, paid: 0, status: "Cancelled" },
  ];
  it("ignores cancelled and sums paid/remaining", () =>
    expect(bookingTotals(rows, 120)).toMatchObject({
      committed: 150,
      paid: 90,
      remaining: 60,
      overBudget: true,
    }));
  it("never returns a negative balance", () => expect(balance({ total: 10, paid: 30 })).toBe(0));
  it("handles zero budget", () => expect(bookingTotals([], 0).percentOfBudget).toBe(0));
});
describe("a11y", () => {
  it("Home has no axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <main>
          <Home />
        </main>
      </MemoryRouter>,
    );
    const r = await axe(container);
    expect(r.violations).toEqual([]);
  });
});
