import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { Loc } from "../src/App.jsx";
export const USER = { id: "u1", name: "Pranshu Kumar", email: "p@example.com" };
export const LOC = { label: "Patna, Bihar, India", lat: 25.6, lng: 85.1 };
export const INPUT = {
  eventType: "birthday",
  date: "2999-01-01",
  guests: 100,
  budget: 400000,
  meal: "veg",
  preferences: "",
  language: "en",
};
export const PLAN = {
  summary: "A joyful birthday plan.",
  budget: [
    { category: "Venue", percent: 50, amountINR: 200000, notes: "" },
    { category: "Catering", percent: 50, amountINR: 200000, notes: "" },
  ],
  timeline: [
    {
      whenLabel: "30 days before",
      daysBeforeEvent: 30,
      dueDate: "2998-12-02",
      task: "Book the venue",
      category: "Venue",
      priority: "high",
      rush: false,
    },
    {
      whenLabel: "Day of event",
      daysBeforeEvent: 0,
      dueDate: "2999-01-01",
      task: "Event day",
      category: "General",
      priority: "medium",
      rush: true,
    },
  ],
  vendorChecklist: [
    { vendorType: "Caterer", whatToAsk: ["Menu"], mustConfirm: ["Date"], estimatedCostINR: 200000 },
  ],
  ideas: { themes: ["Minecraft"], decor: [], menu: [], entertainment: [], giftsOrFavors: [] },
  warnings: [],
  changes: [],
  questions: ["Any dietary needs?"],
};
/** Stateful stand-in for the app's context so pages behave as they do in the real app. */
export function Harness({ children, plan = null, bookings = [], user = USER, loc = LOC }) {
  const [p, setPlan] = useState(plan),
    [b, setBookings] = useState(bookings),
    [l, setLoc] = useState(loc);
  return (
    <Loc.Provider
      value={{
        user,
        setUser() {},
        loc: l,
        setLoc,
        plan: p,
        setPlan,
        bookings: b,
        setBookings,
        saveState: "",
      }}
    >
      <MemoryRouter>
        <main>{children}</main>
      </MemoryRouter>
    </Loc.Provider>
  );
}
export const show = (ui, props) => render(<Harness {...props}>{ui}</Harness>);
