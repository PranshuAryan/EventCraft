const today = () => new Date().toISOString().slice(0, 10);

/**
 * The "Plan your event" form.
 * @param {object} props
 * @param {object} props.values current form values
 * @param {(field: string) => (event: Event) => void} props.onFieldChange
 * @param {(event: Event) => void} props.onSubmit
 * @param {boolean} props.isBusy true while the plan is being built
 * @param {string} props.error message to show under the button
 * @param {{label: string}|null} props.location chosen location, if any
 */
export default function PlanForm({ values, onFieldChange, onSubmit, isBusy, error, location }) {
  return (
    <form onSubmit={onSubmit} className="form" aria-describedby="err">
      <label>
        Event type
        <select value={values.eventType} onChange={onFieldChange("eventType")}>
          <option value="wedding">Wedding</option>
          <option value="birthday">Birthday</option>
          <option value="community">Community event</option>
        </select>
      </label>
      <label>
        Date
        <input
          type="date"
          required
          value={values.date}
          min={today()}
          onChange={onFieldChange("date")}
        />
      </label>
      <label>
        Guests
        <input
          type="number"
          min="1"
          max="5000"
          required
          value={values.guests}
          onChange={onFieldChange("guests")}
        />
      </label>
      <label>
        Total budget (INR)
        <input
          type="number"
          min="1000"
          required
          value={values.budget}
          onChange={onFieldChange("budget")}
        />
      </label>
      <label>
        Meal
        <select value={values.meal} onChange={onFieldChange("meal")}>
          <option value="veg">Vegetarian</option>
          <option value="non-veg">Non-vegetarian</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>
      <label>
        Language
        <select value={values.language} onChange={onFieldChange("language")}>
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </label>
      <label className="full">
        Style and preferences
        <textarea
          maxLength={500}
          rows={3}
          value={values.preferences}
          onChange={onFieldChange("preferences")}
          placeholder="Traditional Bihari rituals, outdoor lawn, December"
        />
      </label>
      <p className="muted full">
        Location:{" "}
        {location
          ? location.label
          : "not set. Use the location button above for better suggestions."}
      </p>
      <button className="btn" disabled={isBusy}>
        {isBusy ? "Building your plan…" : "Build my plan"}
      </button>
      <p id="err" role="alert" className="error">
        {error}
      </p>
    </form>
  );
}
