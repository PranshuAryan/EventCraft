import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { show } from "./helpers.jsx";
import { LocationBar, Account } from "../src/App.jsx";
import { api } from "../src/api.js";
vi.mock("../src/api.js", async (orig) => ({ ...(await orig()), api: vi.fn() }));
const SAKET = [{ label: "Saket, New Delhi, Delhi, India", primary: "Saket", secondary: "New Delhi, Delhi", kind: "Area", lat: 28.5, lng: 77.2 }];
beforeEach(() => { api.mockReset(); api.mockResolvedValue(SAKET); });
describe("Location panel", () => {
  it("opens, has no axe violations, fades the hint when typing, biases search and picks an area", async () => {
    const { container } = show(<LocationBar />);
    fireEvent.click(screen.getByRole("button", { name: "Location: Patna. Change location" }));
    expect(screen.getByRole("button", { name: /use my current location/i })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
    expect(container.querySelector(".ph").dataset.hide).toBe("false");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "saket" } });
    expect(container.querySelector(".ph").dataset.hide).toBe("true");
    const option = await screen.findByRole("option", { name: /Saket/ }, { timeout: 2000 });
    expect(api.mock.calls[0][0]).toContain("&lat=25.6&lng=85.1");
    expect(option.textContent).toContain("Area");
    fireEvent.click(option);
    expect(screen.getByRole("button", { name: "Location: Saket. Change location" })).toBeTruthy();
  });
  it("closes with Escape", () => {
    show(<LocationBar />);
    fireEvent.click(screen.getByRole("button", { name: /Change location/ }));
    fireEvent.keyDown(screen.getByRole("group", { name: "Choose your location" }), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Choose your location" })).toBeNull();
  });
});
describe("Account menu", () => {
  it("shows the name in a dropdown with Log out, no axe violations, closes with Escape", async () => {
    const { container } = show(<Account />);
    expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
    const btn = screen.getByRole("button", { name: /Hi, Pranshu/ });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(screen.getByText("p@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    expect((await axe(container)).violations).toEqual([]);
    fireEvent.keyDown(btn, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Log out" })).toBeNull());
  });
});
