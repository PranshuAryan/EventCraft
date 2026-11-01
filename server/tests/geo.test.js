import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { autocomplete, findPlaces, reverse } from "../src/geo.js";

const curated = JSON.parse(
  readFileSync(new URL("../data/curatedVendors.json", import.meta.url), "utf8"),
);
const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });

beforeEach(() => {
  process.env.GEOAPIFY_API_KEY = "test-key";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GEOAPIFY_API_KEY;
});

describe("autocomplete", () => {
  it("maps, labels and de-duplicates results", async () => {
    const results = [
      {
        formatted: "Boring Road, Patna",
        address_line1: "Boring Road",
        result_type: "street",
        lat: 1,
        lon: 2,
      },
      { formatted: "Boring Road, Patna", result_type: "street", lat: 1, lon: 2 },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ results })),
    );
    const out = await autocomplete("boring road test");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ primary: "Boring Road", kind: "Street", lat: 1, lng: 2 });
  });
  it("caches repeated lookups", async () => {
    const fetchMock = vi.fn(async () => reply({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await autocomplete("cache me please");
    await autocomplete("cache me please");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("throws when Geoapify answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({}, false, 500)),
    );
    await expect(autocomplete("server error test")).rejects.toThrow("geoapify 500");
  });
  it("throws without an API key", async () => {
    delete process.env.GEOAPIFY_API_KEY;
    await expect(autocomplete("no key test")).rejects.toThrow("no geoapify key");
  });
});

describe("reverse", () => {
  it("builds a short label from city and state", async () => {
    const results = [{ city: "Patna", state: "Bihar" }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ results })),
    );
    expect(await reverse(25.111, 85.111)).toEqual({ label: "Patna, Bihar" });
  });
  it("returns a null label when nothing is found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ results: [] })),
    );
    expect(await reverse(1.234, 2.345)).toEqual({ label: null });
  });
});

describe("findPlaces", () => {
  const category = "hotel";
  it("returns Geoapify vendors with distance and map link", async () => {
    const features = [
      {
        properties: { place_id: "p1", name: "Hotel One", formatted: "Addr", lat: 25.6, lon: 85.1 },
      },
      { properties: { place_id: "p2", formatted: "No name", lat: 25.6, lon: 85.1 } },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({ features })),
    );
    const out = await findPlaces({ lat: 25.11, lng: 85.11, category, radius: 1000 });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "g_p1", source: "geoapify", category });
    expect(out[0].mapsUrl).toContain("google.com/maps");
  });
  it("falls back to curated vendors when Geoapify fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply({}, false, 500)),
    );
    const out = await findPlaces({
      lat: 26.11,
      lng: 86.11,
      category: curated[0].category,
      radius: 2000,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((p) => p.source === "curated")).toBe(true);
  });
  it("falls back to curated vendors for categories Geoapify does not cover", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = await findPlaces({ lat: 27.11, lng: 87.11, category: "decorator", radius: 3000 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.every((p) => p.source === "curated")).toBe(true);
  });
});
