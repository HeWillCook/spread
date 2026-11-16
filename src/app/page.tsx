import Link from "next/link";
import { Flames } from "@/components/fire/Flames";
import { GrillBand } from "@/components/fire/GrillBand";
import { GrillMarks } from "@/components/fire/GrillMarks";
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

const stamps = [
  { value: "1 link", caption: "to invite everyone" },
  { value: "0 accounts", caption: "for guests to reply" },
  { value: "every bun counted", caption: "from their answers" },
];

export default async function Home() {
  const host = await getHostOrNull();

  return (
    <main className="flex flex-1 flex-col">
      <div className="page-shell">
        <header className="site-top">
          <Wordmark flame />
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

            <ul className="hero-stamps" aria-label="How Spread works">
              {stamps.map((stamp) => (
                <li key={stamp.value} className="hero-stamp">
                  <GrillMarks />
                  <span className="hero-stamp-value">{stamp.value}</span>
                  <span className="hero-stamp-caption">{stamp.caption}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ticket-slot">
            <div className="ticket-slot-fire">
              <Flames edge="bottom" size="md" />
            </div>
            <div className="ticket-slot-mouth">
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
      </div>

      <GrillBand
        inset={false}
        edge="bottom"
        flameSize="lg"
        emberCount={28}
        emberRise={300}
        className="landing-fire"
      >
        <div className="page-shell landing-fire-inner">
          <div>
            <h2 className="landing-fire-title">
              Fire up the grill. We&apos;ll count the buns.
            </h2>
            <p className="landing-fire-note">
              One link for the guest list, the food and the split. Guests never
              need an account, and the plan keeps up with every reply.
            </p>
          </div>
          <div className="landing-fire-actions">
            <Link href={host ? "/host" : "/signup"} className="cta-primary">
              {host ? "Back to your events" : "Start your plan"}
            </Link>
            <span className="landing-fire-wink">
              Takes a minute. Costs nothing.
            </span>
          </div>
        </div>
      </GrillBand>

      <div className="page-shell">
        <footer className="landing-footer">
          <span>Spread</span>
          <span>Guests answer from a link. Hosts see the plan.</span>
        </footer>
      </div>
    </main>
  );
}
