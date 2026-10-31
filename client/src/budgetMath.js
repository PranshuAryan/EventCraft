export function bookingTotals(bookings, budget = 0) {
  const live = bookings.filter((b) => b.status !== "Cancelled");
  const committed = live.reduce((a, b) => a + (+b.total || 0), 0);
  const paid = live.reduce((a, b) => a + Math.min(+b.paid || 0, +b.total || 0), 0);
  return { committed, paid, remaining: committed - paid, percentOfBudget: budget > 0 ? Math.round((committed / budget) * 100) : 0, overBudget: budget > 0 && committed > budget };
}
export const balance = (b) => Math.max((+b.total || 0) - (+b.paid || 0), 0);
