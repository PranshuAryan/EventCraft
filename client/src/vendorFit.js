import { isNil } from "./utils.js";

/** Words that identify which budget rows belong to each vendor type. */
const BUDGET_KEYWORDS = {
  banquet: ["venue"],
  hotel: ["venue", "accommodation", "stay"],
  caterer: ["cater", "food", "meal"],
  decorator: ["decor"],
  photographer: ["photo", "video"],
};

/** Price tiers: 1 = budget-friendly, 2 = mid-range, 3 = premium. */
export const TIER_NAMES = ["", "budget-friendly", "mid-range", "premium"];

/** [mid-range starts at, premium starts at] in INR per guest, for per-guest vendors. */
const PER_GUEST_TIER_LIMITS = { banquet: [600, 1800], hotel: [600, 1800], caterer: [350, 900] };

/** Total-amount limits (INR) used for vendors that are not priced per guest. */
const FLAT_TIER_LIMITS = [40000, 150000];

const MATCH_BONUS = 20;
const OVER_BUDGET_PENALTY_PER_TIER = 15;

const tierFromLimits = (value, [midStart, premiumStart]) =>
  value < midStart ? 1 : value < premiumStart ? 2 : 3;

/** Which price tier the planned budget for this vendor type falls into. */
export function tierFor(category, amount, guests) {
  const perGuestLimits = PER_GUEST_TIER_LIMITS[category];
  if (perGuestLimits) return tierFromLimits(amount / Math.max(guests, 1), perGuestLimits);
  return tierFromLimits(amount, FLAT_TIER_LIMITS);
}

/**
 * Works out how much of the plan's budget is meant for this vendor type.
 * Returns null when there is no plan or no matching budget row.
 */
export function budgetInfo(savedPlan, category) {
  if (!savedPlan?.plan) return null;
  const keywords = BUDGET_KEYWORDS[category];
  const amount = savedPlan.plan.budget
    .filter((row) => keywords.some((word) => row.category.toLowerCase().includes(word)))
    .reduce((sum, row) => sum + (Number(row.amountINR) || 0), 0);
  if (!amount) return null;

  const guests = Number(savedPlan.input.guests) || 1;
  return {
    amount,
    guests,
    perGuest: Math.round(amount / guests),
    tier: tierFor(category, amount, guests),
    input: savedPlan.input,
  };
}

/** Badge text and style for a vendor, compared with the budget. Null if there is no budget. */
export function describeFit(vendor, info) {
  if (!info) return null;
  if (isNil(vendor.priceLevel)) return { text: "Ask for a quote", kind: "ask" };
  if (vendor.priceLevel === info.tier) return { text: "Fits your budget", kind: "fit" };
  if (vendor.priceLevel < info.tier) return { text: "Under your budget", kind: "fit" };
  return { text: "May exceed your budget", kind: "over" };
}

/** Bonus for vendors within budget, penalty for those above it. Zero when the price is unknown. */
export function budgetScore(vendor, info) {
  if (!info || isNil(vendor.priceLevel)) return 0;
  if (vendor.priceLevel <= info.tier) return MATCH_BONUS;
  return -OVER_BUDGET_PENALTY_PER_TIER * (vendor.priceLevel - info.tier);
}
