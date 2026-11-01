import { AI } from "./config.js";

export const SPLITS = {
  wedding: {
    Venue: 25,
    Catering: 30,
    Decor: 12,
    Photography: 8,
    Attire: 10,
    Entertainment: 5,
    Invitations: 3,
    Contingency: 7,
  },
  birthday: {
    Venue: 20,
    Catering: 35,
    Decor: 15,
    Entertainment: 12,
    Cake: 8,
    Photography: 5,
    Contingency: 5,
  },
  community: {
    Venue: 20,
    Catering: 30,
    Decor: 10,
    "Sound & Lights": 15,
    Permits: 5,
    Publicity: 10,
    Contingency: 10,
  },
};
export function fallbackPlan({ eventType, budget, guests, date }) {
  const s = SPLITS[eventType];
  const budgetRows = Object.entries(s).map(([category, percent]) => ({
    category,
    percent,
    amountINR: Math.round((budget * percent) / 100),
    notes: "",
  }));
  const timeline = scheduleTimeline(TEMPLATE_TASKS, date);
  return {
    summary: `Template plan for ${guests} guests (AI unavailable).`,
    budget: budgetRows,
    timeline,
    vendorChecklist: Object.keys(s)
      .slice(0, 4)
      .map((vendorType) => ({
        vendorType,
        whatToAsk: ["Quote in writing", "Cancellation terms"],
        mustConfirm: ["Date", "Advance amount"],
        estimatedCostINR: Math.round((budget * s[vendorType]) / 100),
      })),
    ideas: { themes: [], decor: [], menu: [], entertainment: [], giftsOrFavors: [] },
    changes: [],
    questions: [
      "Do you prefer an indoor hall, a hotel or an open lawn?",
      "Are there elderly guests, young children or dietary needs we should plan for?",
      "Which matters most to you: food, decor, entertainment or photography?",
    ],
    warnings: [
      "Showing a template plan because the AI service was unavailable.",
      ...timeWarning(date),
    ],
  };
}
export function repairJson(text) {
  const t = String(text)
    .replace(/```json|```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
  return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
}
// Control characters are stripped on purpose: this text is embedded into AI prompts.
/** Removes control characters and angle brackets, then trims to `max` characters. */
export const sanitize = (s, max = 300) =>
  String(s ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .slice(0, max)
    .trim();
export function haversine(a, b, c, d) {
  const r = (x) => (x * Math.PI) / 180,
    R = 6371;
  const h =
    Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return +(2 * R * Math.asin(Math.sqrt(h))).toFixed(1);
}
export const mapsUrl = (name, lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}+${lat},${lng}`;
export function keepKnownIds(ranked, places) {
  const ids = new Set(places.map((p) => p.id));
  return (Array.isArray(ranked) ? ranked : []).filter((r) => ids.has(r?.id));
}
const NOT_CHAT = /whisper|guard|tts|playai|orpheus|embed|distil|compound|safeguard/i;
export function chooseModel(ids) {
  return (
    AI.preferredModels.find((m) => ids.includes(m)) ?? ids.find((id) => !NOT_CHAT.test(id)) ?? null
  );
}

const DAY = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const daysUntil = (dateStr, now = new Date()) =>
  dateStr ? Math.max(Math.round((parseDate(dateStr) - startOfDay(now)) / DAY), 0) : Infinity;
export const timeWarning = (dateStr, now = new Date()) => {
  const n = daysUntil(dateStr, now);
  return n < 30
    ? [
        `Only ${n} day(s) left. Tasks are compressed: book the venue and caterer first, because dates fill up fast.`,
      ]
    : [];
};
// [ideal days before, task, minimum days of notice a vendor realistically needs]
export const TEMPLATE_TASKS = [
  [90, "Finalize budget, guest list and theme", 14],
  [75, "Book venue and pay deposit", 30],
  [60, "Send digital invitations", 21],
  [45, "Confirm menu and per-head cost with caterer", 21],
  [30, "Hire decorator and approve design mock-up", 21],
  [30, "Book photographer or videographer", 21],
  [21, "Arrange DJ/MC and entertainment", 10],
  [14, "Order gifts or favors and confirm designs", 7],
  [7, "Send final headcount to caterer and confirm rentals", 3],
  [1, "Venue setup, decor installation and sound check", 1],
  [0, "Event day: execution and coordination", 0],
].map(([ideal, task, min]) => ({ ideal, task, min }));
/** Turns ideal lead times into real calendar dates that fit the time actually available. */
export function scheduleTimeline(tasks, dateStr, now = new Date()) {
  const today = startOfDay(now),
    event = dateStr ? parseDate(dateStr) : null;
  const available = event ? Math.max(Math.round((event - today) / DAY), 0) : Infinity;
  const window = Math.max(90, ...tasks.map((t) => +t.ideal || 0));
  return tasks
    .map((t) => {
      const ideal = Math.max(Math.round(+t.ideal || 0), 0),
        min = Math.max(+t.min || 0, 0);
      const lead =
        available >= window
          ? ideal
          : ideal <= 1
            ? Math.min(ideal, available)
            : Math.min(Math.max(Math.round((ideal * available) / window), 1), available);
      const base =
        lead === 0 ? "Day of event" : lead === 1 ? "1 day before" : `${lead} days before`;
      const rush = lead < ideal && lead < min;
      return {
        whenLabel: event && lead === available && lead > 0 ? "Start today" : base,
        daysBeforeEvent: lead,
        dueDate: event
          ? isoDate(new Date(event.getFullYear(), event.getMonth(), event.getDate() - lead))
          : "",
        task: t.task,
        category: t.category ?? "General",
        priority: rush ? "high" : (t.priority ?? "medium"),
        rush,
      };
    })
    .sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);
}

/** Scales AI budget rows so they add up to the real total (within 0.5%), fixing rounding on the largest row. */
export function normalizeBudget(rows, total) {
  const sum = rows.reduce((a, r) => a + (+r.amountINR || 0), 0);
  if (!rows.length || !(total > 0) || sum <= 0 || Math.abs(sum - total) <= total * 0.005)
    return rows;
  const out = rows.map((r) => ({ ...r, amountINR: Math.round((r.amountINR * total) / sum) }));
  const drift = total - out.reduce((a, r) => a + r.amountINR, 0);
  out[out.reduce((m, r, i) => (r.amountINR > out[m].amountINR ? i : m), 0)].amountINR += drift;
  return out.map((r) => ({ ...r, percent: Math.round((r.amountINR / total) * 100) }));
}
