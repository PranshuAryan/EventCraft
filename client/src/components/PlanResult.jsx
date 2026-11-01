import { Link } from "react-router-dom";
import { inr } from "../api.js";
import { BudgetTable, Ideas, Timeline, VendorChecklist } from "./PlanSections.jsx";
import RefineForm from "./RefineForm.jsx";

/** How far the category amounts may drift from the budget before we warn the user. */
const BUDGET_TOLERANCE = 0.02;

/** Shows a finished plan: summary, notices, budget, timeline, checklist, ideas and refine form. */
export default function PlanResult({ saved, refine }) {
  const plan = saved.plan;
  const budget = saved.input.budget;
  const total = plan.budget.reduce((sum, row) => sum + row.amountINR, 0);
  const isOffBudget = Math.abs(total - budget) > budget * BUDGET_TOLERANCE;

  return (
    <div className="plan" aria-live="polite">
      <h2>
        Your plan {saved.version > 1 && <span className="badge ask">Version {saved.version}</span>}
      </h2>
      <p>{plan.summary}</p>
      {plan.changes?.length > 0 && (
        <div className="notice">
          <b>What changed in this version</b>
          <ul>
            {plan.changes.map((change, index) => (
              <li key={index}>{change}</li>
            ))}
          </ul>
        </div>
      )}
      {saved.fallback && (
        <p className="notice">
          AI was unavailable, so this is a standard template plan.
          {saved.reason && <> Reason: {saved.reason}</>}
        </p>
      )}
      {isOffBudget && (
        <p role="alert" className="error">
          Category amounts add up to {inr(total)}, not your budget of {inr(budget)}.
        </p>
      )}
      <BudgetTable rows={plan.budget} />
      <Timeline tasks={plan.timeline} eventDate={saved.input.date} />
      <VendorChecklist items={plan.vendorChecklist} />
      <Ideas ideas={plan.ideas} />
      <RefineForm
        questions={plan.questions}
        notes={refine.notes}
        onNotesChange={refine.setNotes}
        onSubmit={refine.onSubmit}
        isBusy={refine.isBusy}
        error={refine.error}
        canUndo={Boolean(saved.prev)}
        onUndo={refine.onUndo}
      />
      <p>
        <Link className="btn" to="/discover">
          Find vendors near you
        </Link>{" "}
        <button className="btn ghost" onClick={() => window.print()}>
          Print plan
        </button>
      </p>
    </div>
  );
}
