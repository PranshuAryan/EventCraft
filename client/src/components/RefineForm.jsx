const MIN_NOTE_LENGTH = 3;

/**
 * Lets the user add details so the AI can improve the plan, and undo the last improvement.
 */
export default function RefineForm({
  questions = [],
  notes,
  onNotesChange,
  onSubmit,
  isBusy,
  error,
  canUndo,
  onUndo,
}) {
  const addQuestionToNotes = (question) =>
    onNotesChange((current) => `${current ? `${current}\n` : ""}${question} `);

  return (
    <form className="refine" onSubmit={onSubmit} aria-labelledby="refh">
      <h3 id="refh">Make this plan better</h3>
      {questions.length > 0 && (
        <>
          <p className="muted">Tap a question to answer it, or add your own details:</p>
          <ul className="qs">
            {questions.map((question) => (
              <li key={question}>
                <button type="button" className="chip" onClick={() => addQuestionToNotes(question)}>
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <label htmlFor="more">Tell us more about your event</label>
      <textarea
        id="more"
        rows={4}
        maxLength={800}
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Chief guest is coming, 20 children under 10, we want a gaming corner, no loud music after 9pm…"
      />
      <p>
        <button className="btn" disabled={isBusy || notes.trim().length < MIN_NOTE_LENGTH}>
          {isBusy ? "Improving your plan…" : "Improve my plan"}
        </button>{" "}
        {canUndo && (
          <button type="button" className="btn ghost" onClick={onUndo}>
            Undo last improvement
          </button>
        )}
      </p>
      <p role="alert" className="error">
        {error}
      </p>
    </form>
  );
}
