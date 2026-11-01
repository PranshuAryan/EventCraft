import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { show, PLAN, INPUT } from "./helpers.jsx";
import Planner from "../src/pages/Planner.jsx";
import { api } from "../src/api.js";
vi.mock("../src/api.js", async (orig) => ({ ...(await orig()), api: vi.fn() }));
let refineResult;
beforeEach(() => {
  refineResult = { plan: PLAN, fallback: true, reason: "test" };
  api.mockReset();
  api.mockImplementation(async (path) =>
    path.startsWith("/plan/refine") ? refineResult : { plan: PLAN, fallback: false },
  );
});
const build = async () => {
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2999-01-01" } });
  fireEvent.submit(screen.getByRole("button", { name: /build my plan/i }).closest("form"));
  await screen.findByRole("heading", { name: /your plan/i });
};
describe("Planner", () => {
  it("form has no axe violations", async () => {
    const { container } = show(<Planner />);
    expect((await axe(container)).violations).toEqual([]);
  });
  it("sends the form to the API and shows budget, dated timeline and checklist", async () => {
    const { container } = show(<Planner />);
    await build();
    expect(api).toHaveBeenCalledWith("/plan", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(api.mock.calls[0][1].body)).toMatchObject({
      eventType: "wedding",
      guests: 100,
      location: "Patna, Bihar, India",
    });
    expect(screen.getByRole("table", { name: "Budget by category" })).toBeTruthy();
    expect(screen.getByText(/Book the venue/)).toBeTruthy();
    expect(screen.getByText(/Rush: book as soon as possible/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
  it("refine: needs text, question chips fill the box, AI failure leaves the plan unchanged", async () => {
    show(<Planner />);
    await build();
    const improve = screen.getByRole("button", { name: "Improve my plan" });
    expect(improve.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Any dietary needs?" }));
    expect(screen.getByLabelText("Tell us more about your event").value).toContain(
      "Any dietary needs?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Improve my plan" }));
    await waitFor(() => expect(screen.getByText(/nothing was changed/i)).toBeTruthy());
    expect(screen.queryByText(/Version 2/)).toBeNull();
  });
  it("refine: success shows what changed, bumps the version, and can be undone", async () => {
    refineResult = {
      plan: { ...PLAN, summary: "Improved plan", changes: ["Added a gaming corner"] },
      fallback: false,
    };
    show(<Planner />, { plan: { input: INPUT, plan: PLAN, fallback: false } });
    fireEvent.change(screen.getByLabelText("Tell us more about your event"), {
      target: { value: "We want a gaming corner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Improve my plan" }));
    await screen.findByText("Added a gaming corner");
    expect(screen.getByText("Version 2")).toBeTruthy();
    expect(JSON.parse(api.mock.calls.at(-1)[1].body)).toMatchObject({
      notes: "We want a gaming corner",
      history: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "Undo last improvement" }));
    await waitFor(() => expect(screen.queryByText("Version 2")).toBeNull());
    expect(screen.getByText("A joyful birthday plan.")).toBeTruthy();
  });
});
