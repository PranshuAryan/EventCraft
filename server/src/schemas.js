import { z } from "zod";
export const PlanInput = z.object({
  eventType: z.enum(["wedding", "birthday", "community"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => new Date(d) >= new Date(new Date().toDateString()), "Date must not be in the past"),
  guests: z.number().int().min(1).max(5000),
  budget: z.number().positive().max(1e9),
  meal: z.enum(["veg", "non-veg", "mixed"]).default("veg"),
  location: z.string().max(100),
  preferences: z.string().max(500).default(""),
  language: z.enum(["en", "hi"]).default("en"),
});
export const PlacesQuery = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180), category: z.enum(["hotel", "banquet", "caterer", "decorator", "photographer"]), radius: z.coerce.number().min(500).max(50000).default(10000) });
export const RankInput = z.object({ places: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).max(40), preferences: z.string().max(500).default("") });

// AI replies vary in shape, so these helpers accept common variants and coerce them.
const text = (v) => (typeof v === "string" ? v : v && typeof v === "object" ? Object.values(v).join(" - ") : String(v ?? ""));
const S = z.preprocess((v) => (Array.isArray(v) ? v.map(text) : typeof v === "string" ? [v] : []), z.array(z.string()));
const N = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) : v), z.number().catch(0));
const Str = (d = "") => z.preprocess((v) => (v == null ? undefined : text(v)), z.string().default(d));
const list = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.entries(v).map(([k, x]) => (x && typeof x === "object" ? { category: k, vendorType: k, ...x } : { category: k, vendorType: k, amountINR: x })) : []);
export const PlanSchema = z.object({
  summary: Str("Your event plan"),
  budget: z.preprocess(list, z.array(z.object({ category: Str("Other"), percent: N, amountINR: N, notes: Str() }))),
  timeline: z.preprocess(list, z.array(z.object({ whenLabel: Str(), daysBeforeEvent: N, minDaysBefore: N, dueDate: Str(), rush: z.boolean().catch(false), task: Str("Task"), category: Str("General"), priority: Str("medium") }))),
  vendorChecklist: z.preprocess(list, z.array(z.object({ vendorType: Str("Vendor"), whatToAsk: S, mustConfirm: S, estimatedCostINR: N }))),
  ideas: z.preprocess((v) => v ?? {}, z.object({ themes: S, decor: S, menu: S, entertainment: S, giftsOrFavors: S })),
  warnings: S,
  changes: S,
  questions: S,
});
export const RegisterInput = z.object({ name: z.string().trim().min(1, "Name is required").max(60), email: z.string().trim().email("Enter a valid email").max(120), password: z.string().min(8, "Password must be at least 8 characters").max(100) });
export const LoginInput = z.object({ email: z.string().trim().email("Enter a valid email").max(120), password: z.string().min(1, "Password is required").max(100) });
const Money = z.union([z.string().max(20), z.number()]);
export const DataInput = z.object({
  plan: z.record(z.any()).nullable(),
  bookings: z.array(z.object({ id: z.string().max(64), vendor: z.string().max(80), total: Money, paid: Money, status: z.enum(["Inquiry", "Negotiating", "Confirmed", "Cancelled"]) })).max(200),
});
export const RefineInput = z.object({
  input: PlanInput,
  plan: z.record(z.any()),
  notes: z.string().trim().min(3, "Tell us a little more").max(800),
  history: z.array(z.string().max(800)).max(10).default([]),
});
