import { useState } from "react";
import { inr } from "../api.js";
import { bookingTotals, balance } from "../budgetMath.js";
import { useLoc } from "../App.jsx";
const STATUS = ["Inquiry", "Negotiating", "Confirmed", "Cancelled"];
export default function Tracker() {
  const { plan, bookings: rows, setBookings: setRows } = useLoc();
  const budget = plan?.input?.budget ?? 0;
  const [d, setD] = useState({ vendor: "", total: "", paid: "0", status: "Inquiry" });
  const t = bookingTotals(rows, budget);
  const add = (e) => {
    e.preventDefault();
    setRows([...rows, { id: crypto.randomUUID(), ...d }]);
    setD({ vendor: "", total: "", paid: "0", status: "Inquiry" });
  };
  const upd = (id, k, v) => setRows(rows.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  return (
    <section className="wrap">
      <h1>Bookings and payments</h1>
      <dl className="stats">
        <div>
          <dt>Committed</dt>
          <dd>{inr(t.committed)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{inr(t.paid)}</dd>
        </div>
        <div>
          <dt>Still to pay</dt>
          <dd>{inr(t.remaining)}</dd>
        </div>
        {budget > 0 && (
          <div>
            <dt>Of your budget</dt>
            <dd>{t.percentOfBudget}%</dd>
          </div>
        )}
      </dl>
      {budget > 0 && (
        <progress
          max="100"
          value={Math.min(t.percentOfBudget, 100)}
          aria-label="Share of budget committed"
        />
      )}
      {t.overBudget && (
        <p role="alert" className="error">
          You have committed more than your {inr(budget)} budget.
        </p>
      )}
      <form onSubmit={add} className="form">
        <label>
          Vendor
          <input
            required
            maxLength={80}
            value={d.vendor}
            onChange={(e) => setD({ ...d, vendor: e.target.value })}
          />
        </label>
        <label>
          Agreed amount
          <input
            type="number"
            min="0"
            required
            value={d.total}
            onChange={(e) => setD({ ...d, total: e.target.value })}
          />
        </label>
        <label>
          Paid so far
          <input
            type="number"
            min="0"
            value={d.paid}
            onChange={(e) => setD({ ...d, paid: e.target.value })}
          />
        </label>
        <label>
          Status
          <select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value })}>
            {STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="btn">Add booking</button>
      </form>
      {rows.length === 0 ? (
        <p className="muted">No bookings yet. Add your first vendor above.</p>
      ) : (
        <table>
          <caption className="sr">Bookings</caption>
          <thead>
            <tr>
              <th scope="col">Vendor</th>
              <th scope="col">Status</th>
              <th scope="col">Agreed</th>
              <th scope="col">Paid</th>
              <th scope="col">Balance</th>
              <th scope="col">
                <span className="sr">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.vendor}</th>
                <td>
                  <select
                    aria-label={`Status for ${r.vendor}`}
                    value={r.status}
                    onChange={(e) => upd(r.id, "status", e.target.value)}
                  >
                    {STATUS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{inr(r.total)}</td>
                <td>
                  <input
                    aria-label={`Paid to ${r.vendor}`}
                    type="number"
                    min="0"
                    value={r.paid}
                    onChange={(e) => upd(r.id, "paid", e.target.value)}
                  />
                </td>
                <td>{inr(balance(r))}</td>
                <td>
                  <button
                    className="btn ghost"
                    onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                    aria-label={`Delete ${r.vendor}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
