import { Link } from "react-router-dom";
import PlanShowcase from "./PlanShowcase.jsx";
export default function Home() {
  return (
    <>
      <section className="hero wrap">
        <div>
          <h1>Your event, counted down to the day.</h1>
          <p className="lead">Tell us what you are celebrating, how many people are coming and what you can spend. EventCraft builds the budget, the booking calendar and a shortlist of real venues near you.</p>
          <p><Link className="btn" to="/plan">Start planning</Link> <Link className="btn ghost" to="/discover">Browse nearby vendors</Link></p>
        </div>
        <PlanShowcase />
      </section>
      <section className="wrap uses">
        <h2>Built for the events people actually host</h2>
        <div className="grid">
          <article><h3>Weddings</h3><p>Split a family budget across venue, food, decor and rituals, with room for surprises.</p></article>
          <article><h3>Birthdays</h3><p>Themes, cakes and entertainment sized to the guest list.</p></article>
          <article><h3>Community events</h3><p>Pujas, melas and charity drives with permits and publicity on the checklist.</p></article>
        </div>
      </section>
      <section className="wrap uses">
        <h2>What you get</h2>
        <div className="grid">
          <article><h3>Budget split</h3><p>Every rupee assigned to a category, checked against your total.</p></article>
          <article><h3>Real vendors</h3><p>Hotels, banquets and caterers pulled from map data and matched to your budget, never invented.</p></article>
          <article><h3>Payment tracker</h3><p>See what is booked, what you paid and what is still due.</p></article>
        </div>
      </section>
    </>
  );
}
