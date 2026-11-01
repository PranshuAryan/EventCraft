import { inr } from "../api.js";
import { formatDate, daysUntil } from "../utils.js";

/** Budget split by category, with a small bar showing each share. */
export function BudgetTable({ rows }) {
  return (
    <>
      <h3>Budget</h3>
      <table>
        <caption className="sr">Budget by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Share</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row">{row.category}</th>
              <td>
                <span
                  className="bar"
                  style={{ width: `${row.percent * 2}px` }}
                  aria-hidden="true"
                />{" "}
                {row.percent}%
              </td>
              <td>{inr(row.amountINR)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Dated to-do list leading up to the event. */
export function Timeline({ tasks, eventDate }) {
  return (
    <>
      <h3>Timeline</h3>
      <p className="muted">
        {daysUntil(eventDate)} days until your event on {formatDate(eventDate)}. Dates below are
        calculated from today.
      </p>
      <ol className="tl">
        {tasks.map((task, index) => (
          <li key={index}>
            <b>{formatDate(task.dueDate)}</b> · {task.whenLabel}: {task.task}
            {task.rush && <strong className="error"> (Rush: book as soon as possible)</strong>}
          </li>
        ))}
      </ol>
    </>
  );
}

/** What to ask and confirm with each type of vendor. */
export function VendorChecklist({ items }) {
  return (
    <>
      <h3>Vendor checklist</h3>
      {items.map((vendor) => (
        <details key={vendor.vendorType}>
          <summary>
            {vendor.vendorType} · about {inr(vendor.estimatedCostINR)}
          </summary>
          <p>Ask: {vendor.whatToAsk.join("; ")}</p>
          <p>Confirm: {vendor.mustConfirm.join("; ")}</p>
        </details>
      ))}
    </>
  );
}

/** Theme, decor, menu and other ideas. Shows nothing if there are none. */
export function Ideas({ ideas }) {
  const filled = Object.entries(ideas).filter(([, list]) => list.length);
  if (!filled.length) return null;
  return (
    <>
      <h3>Ideas</h3>
      {filled.map(([name, list]) => (
        <p key={name}>
          <b>{name}:</b> {list.join(", ")}
        </p>
      ))}
    </>
  );
}
