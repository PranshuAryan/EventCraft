import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { show, INPUT, PLAN } from "./helpers.jsx";
import Tracker from "../src/pages/Tracker.jsx";
const add = (vendor, total, paid = "0") => {
  fireEvent.change(screen.getByLabelText("Vendor"), { target: { value: vendor } });
  fireEvent.change(screen.getByLabelText("Agreed amount"), { target: { value: total } });
  fireEvent.change(screen.getByLabelText("Paid so far"), { target: { value: paid } });
  fireEvent.submit(screen.getByRole("button", { name: "Add booking" }).closest("form"));
};
describe("Tracker", () => {
  it("shows an empty state and has no axe violations", async () => {
    const { container } = show(<Tracker />, { plan: { input: INPUT, plan: PLAN } });
    expect(screen.getByText(/No bookings yet/)).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
  });
  it("adds a booking, computes the balance and totals, and removes it", async () => {
    const { container } = show(<Tracker />, { plan: { input: INPUT, plan: PLAN } });
    add("Sharma Caterers", "50000", "20000");
    expect(await screen.findByRole("table", { name: "Bookings" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "Sharma Caterers" })).toBeTruthy();
    expect(screen.getAllByText("₹30,000").length).toBeGreaterThan(0); // balance and still-to-pay
    expect(screen.queryByRole("alert", { name: "" })).toBeNull();
    expect((await axe(container)).violations).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Sharma Caterers" }));
    expect(screen.getByText(/No bookings yet/)).toBeTruthy();
  });
  it("warns when commitments pass the budget", () => {
    show(<Tracker />, { plan: { input: { ...INPUT, budget: 40000 }, plan: PLAN } });
    add("Grand Hall", "50000");
    expect(screen.getByRole("alert").textContent).toMatch(/committed more than your ₹40,000/);
  });
});
