import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { show, PLAN, INPUT } from "./helpers.jsx";
import Discover from "../src/pages/Discover.jsx";
import { api } from "../src/api.js";
vi.mock("../src/api.js", async (orig) => ({ ...(await orig()), api: vi.fn() }));
const place = (id, name, priceLevel, phone = null) => ({ id, name, category: "banquet", address: "Sample road", lat: 25.6, lng: 85.1, phone, website: null, rating: null, priceLevel, distanceKm: 1.2, source: "geoapify", mapsUrl: "https://www.google.com/maps/search/?api=1&query=x" });
beforeEach(() => { api.mockReset(); api.mockImplementation(async (path) => (path.startsWith("/places") ? [place("a", "Hall A", 2), place("b", "Hall B", null), place("c", "Hall C", 3, "+911234567890")] : [])); });
describe("Discover", () => {
  it("shows budget-fit badges, contact fallback and a Maps link; no axe violations", async () => {
    const { container } = show(<Discover />, { plan: { input: INPUT, plan: PLAN } });
    await screen.findByText("Hall A");
    // Venue budget 200000 / 100 guests = 2000 per guest, which is the premium tier.
    expect(screen.getByText(/₹2,00,000/)).toBeTruthy();
    expect(screen.getByText("Under your budget")).toBeTruthy();
    expect(screen.getByText("Ask for a quote")).toBeTruthy();
    expect(screen.getByText("Fits your budget")).toBeTruthy();
    expect(screen.getAllByText(/Contact not listed/).length).toBe(2);
    expect(screen.getByRole("link", { name: "Call +911234567890" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Open in Google Maps" })[0].getAttribute("rel")).toContain("noopener");
    expect((await axe(container)).violations).toEqual([]);
  });
  it("asks for a plan first when there is none", async () => {
    show(<Discover />);
    expect(screen.getByText(/Build a plan first/)).toBeTruthy();
    await screen.findByText("Hall A");
    expect(screen.queryByText("Fits your budget")).toBeNull();
  });
  it("searches with the chosen radius", async () => {
    show(<Discover />);
    await screen.findByText("Hall A");
    expect(api.mock.calls[0][0]).toContain("radius=10000");
  });
});
