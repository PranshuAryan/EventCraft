import { useState } from "react";
import { api } from "../api.js";
import PlanForm from "../components/PlanForm.jsx";
import PlanResult from "../components/PlanResult.jsx";
import { useLoc } from "../context.js";

const DEFAULT_FORM = {
  eventType: "wedding",
  date: "",
  guests: 100,
  budget: 500000,
  meal: "veg",
  preferences: "",
  language: "en",
};
const MAX_SAVED_NOTES = 10;
const DEFAULT_LOCATION = "India";
const REFINE_FAILED_MESSAGE =
  "The AI could not update your plan right now, so nothing was changed. Your details are still in the box.";

/** Converts form values (strings) into what the API expects (numbers and a location). */
const toApiInput = (input, locationLabel) => ({
  ...input,
  guests: Number(input.guests),
  budget: Number(input.budget),
  location: locationLabel,
});

/** Page where the user describes an event, gets an AI plan, and improves it. */
export default function Planner() {
  const { loc, plan: savedPlan, setPlan: setSavedPlan } = useLoc();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [notes, setNotes] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const locationLabel = loc?.label ?? DEFAULT_LOCATION;

  const changeField = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function buildPlan(event) {
    event.preventDefault();
    setIsBuilding(true);
    setBuildError("");
    try {
      const result = await api("/plan", {
        method: "POST",
        body: JSON.stringify(toApiInput(form, locationLabel)),
      });
      setSavedPlan({ input: form, ...result });
    } catch (error) {
      setBuildError(error.message);
    } finally {
      setIsBuilding(false);
    }
  }

  async function improvePlan(event) {
    event.preventDefault();
    setIsRefining(true);
    setRefineError("");
    try {
      const result = await api("/plan/refine", {
        method: "POST",
        body: JSON.stringify({
          input: toApiInput(savedPlan.input, locationLabel),
          plan: savedPlan.plan,
          notes,
          history: savedPlan.notes ?? [],
        }),
      });
      if (result.fallback) {
        return setRefineError(`${REFINE_FAILED_MESSAGE} ${result.reason ?? ""}`);
      }
      setSavedPlan({
        ...savedPlan,
        plan: result.plan,
        fallback: false,
        reason: undefined,
        prev: { plan: savedPlan.plan },
        version: (savedPlan.version ?? 1) + 1,
        notes: [...(savedPlan.notes ?? []), notes].slice(-MAX_SAVED_NOTES),
      });
      setNotes("");
    } catch (error) {
      setRefineError(error.message);
    } finally {
      setIsRefining(false);
    }
  }

  const undoImprovement = () =>
    setSavedPlan({
      ...savedPlan,
      plan: savedPlan.prev.plan,
      prev: null,
      version: Math.max((savedPlan.version ?? 2) - 1, 1),
      notes: (savedPlan.notes ?? []).slice(0, -1),
    });

  return (
    <section className="wrap">
      <h1>Plan your event</h1>
      <PlanForm
        values={form}
        onFieldChange={changeField}
        onSubmit={buildPlan}
        isBusy={isBuilding}
        error={buildError}
        location={loc}
      />
      {savedPlan?.plan && (
        <PlanResult
          saved={savedPlan}
          refine={{
            notes,
            setNotes,
            onSubmit: improvePlan,
            isBusy: isRefining,
            error: refineError,
            onUndo: undoImprovement,
          }}
        />
      )}
    </section>
  );
}
