import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

const explainers = [
  {
    title: "One link, no accounts.",
    body: "Guests open your link and RSVP without signing up. Each person sees their own answer; names stay private from other guests.",
  },
  {
    title: "Maybes stay estimates.",
    body: "Choose what share of maybes to expect. People who have not replied stay unknown, so the food plan does not quietly grow.",
  },
  {
    title: "Quantities, not guesswork.",
    body: "Replies become portion counts and a shopping list you can edit. Split the cost afterwards, and record payments yourself. A Venmo link does not confirm one.",
  },
];

export default async function Home() {
  const host = await getHostOrNull();

  return (
    <main className="page-shell flex-1">
      <header className="site-top">
        <Wordmark />
        <nav aria-label="Account">
          {host ? (
            <Link href="/host" className="quiet-link">
              Your events
            </Link>
          ) : (
            <Link href="/login" className="quiet-link">
              Log in
            </Link>
          )}
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div>
          <h1 id="landing-title" className="display-hero">
            <span className="block">Enough food.</span>
            <span className="block">More time together.</span>
          </h1>
          <p className="hero-lede">
            Share one link. Guests answer without an account, and Spread turns
            their replies into a shopping list, a headcount you can plan for, and
            an editable cost split.
          </p>
          <div className="hero-actions">
            <Link href={host ? "/host" : "/signup"} className="cta-primary">
              {host ? "Go to your events" : "Host a get-together"}
            </Link>
          </div>
          <p className="hero-note">
            Guests reply in their browser. No app to install.
          </p>
        </div>

        <div className="ticket-slot">
          <figure className="ticket plan-preview" aria-labelledby="example-title">
            <div className="preview-head">
              <div>
                <h2 id="example-title" className="preview-title">
                  Saturday cookout
                </h2>
                <p className="preview-meta">Sat, Jun 14 · 6pm · The backyard</p>
              </div>
              <Pill tone="quiet">Example</Pill>
            </div>

            <div className="preview-count">
              <p>
                <span className="ticket-count-label">Plan for </span>
                <span className="ticket-count-number">~4</span>
              </p>
              <p className="preview-summary">
                3 confirmed + about 1 from maybes{" "}
                <span className="text-muted">(range 3–4)</span>
              </p>
            </div>

            <ul className="preview-guests">
              <li>
                <span>Priya</span>
                <Pill tone="pickle">Going</Pill>
              </li>
              <li>
                <span>Sam + 1</span>
                <Pill tone="pickle">Going</Pill>
              </li>
              <li>
                <span>Alex</span>
                <Pill tone="mustard">Maybe</Pill>
              </li>
            </ul>

            <div className="preview-shopping">
              <h3>Shopping list</h3>
              <ul className="preview-shopping-list">
                <li>
                  <span>Burgers</span>
                  <span>6</span>
                </li>
                <li>
                  <span>Ground beef</span>
                  <span>2 lb</span>
                </li>
                <li>
                  <span>Buns</span>
                  <span>6</span>
                </li>
              </ul>
            </div>

            <figcaption className="preview-caption">
              Example plan. Your numbers come from your guests&apos; answers.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="landing-explainer" aria-labelledby="how-title">
        <h2 id="how-title">The plan follows the people.</h2>
        <div className="explain-list">
          {explainers.map((item) => (
            <div key={item.title} className="explain-row">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Spread</span>
        <span>Guests answer from a link. Hosts see the plan.</span>
      </footer>
    </main>
  );
}
