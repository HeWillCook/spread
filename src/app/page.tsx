import Link from "next/link";
import { OccasionScene } from "@/components/occasion/OccasionScene";
import { Bunting } from "@/components/scrapbook/Bunting";
import { Sticker } from "@/components/scrapbook/Sticker";
import { WashiTape } from "@/components/scrapbook/WashiTape";
import { Pill } from "@/components/ui/Pill";
import { Wordmark } from "@/components/ui/Wordmark";
import { occasionSticker, type OccasionTheme } from "@/lib/occasion";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

const explainers = [
  {
    title: "One link, no accounts.",
    sticker: "ticket" as const,
    body: "Guests open your link and RSVP without signing up. Each person sees their own answer; names stay private from other guests.",
  },
  {
    title: "Maybes stay estimates.",
    sticker: "balloon" as const,
    body: "Choose what share of maybes to expect. People who have not replied stay unknown, so the food plan does not quietly grow.",
  },
  {
    title: "Quantities, not guesswork.",
    sticker: "basket" as const,
    body: "Replies become portion counts and a shopping list you can edit. Split the cost afterwards, and record payments yourself. A Venmo link does not confirm one.",
  },
];

const stamps = [
  { value: "1 link", caption: "to invite everyone" },
  { value: "every bun counted", caption: "from their answers" },
];

const miniOccasions: { theme: OccasionTheme; name: string; note: string }[] = [
  { theme: "picnic", name: "Picnic", note: "A blanket and a list." },
  { theme: "birthday", name: "Birthday", note: "Candles and portions." },
  { theme: "holiday", name: "Holiday", note: "A table for twelve." },
  { theme: "gamenight", name: "Game night", note: "Snacks and a score." },
  { theme: "toast", name: "Toast", note: "Bubbles and bites." },
  { theme: "cookout", name: "Cookout", note: "Burgers and buns." },
];

export default async function Home() {
  const host = await getHostOrNull();

  return (
    <main className="flex flex-1 flex-col">
      <div className="page-shell">
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
          <Bunting count={18} className="landing-bunting" />

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

            <ul className="hero-stamps" aria-label="How Spread works">
              {stamps.map((stamp) => (
                <li key={stamp.value} className="hero-stamp">
                  <WashiTape pattern="stripe" tone="mustard" tilt={-3} />
                  <span className="hero-stamp-value">{stamp.value}</span>
                  <span className="hero-stamp-caption">{stamp.caption}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ticket-slot">
            <span className="ticket-tape ticket-tape-left">
              <WashiTape pattern="gingham" tone="mustard" tilt={-4} />
            </span>
            <span className="ticket-tape ticket-tape-right">
              <WashiTape pattern="stripe" tone="ketchup" tilt={3} />
            </span>

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

            <span className="ticket-stickers" aria-hidden="true">
              <Sticker
                name="sun"
                size="md"
                peel
                delay={0.15}
                className="ticket-sticker ticket-sticker-sun"
              />
              <Sticker
                name="balloon"
                size="md"
                peel
                delay={0.3}
                className="ticket-sticker ticket-sticker-balloon"
              />
              <Sticker
                name="watermelon"
                size="lg"
                peel
                delay={0.45}
                className="ticket-sticker ticket-sticker-watermelon"
              />
              <Sticker
                name="cake"
                size="md"
                peel
                delay={0.6}
                className="ticket-sticker ticket-sticker-cake"
              />
            </span>
          </div>
        </section>

        <section className="landing-explainer" aria-labelledby="how-title">
          <h2 id="how-title">The plan follows the people.</h2>
          <div className="explain-list">
            {explainers.map((item) => (
              <div key={item.title} className="explain-row">
                <div className="explain-heading">
                  <Sticker
                    name={item.sticker}
                    size="md"
                    className="explain-sticker"
                  />
                  <h3>{item.title}</h3>
                </div>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="occasion-band" aria-labelledby="occasions-title">
        <div className="page-shell">
          <div className="occasion-band-paper">
            <h2 id="occasions-title" className="occasion-band-title">
              For every kind of get-together.
            </h2>
            <p className="occasion-band-lede">
              Birthdays, holidays, game nights, a quiet brunch. The plan follows
              the occasion, and every guest gets the same simple link.
            </p>

            <ul className="occasion-mini-row">
              {miniOccasions.map(({ theme, name, note }) => (
                <li key={theme} className="occasion-mini">
                  <div className="occasion-mini-scene">
                    <OccasionScene theme={theme} size="strip" />
                  </div>
                  <div className="occasion-mini-body">
                    <span className="occasion-mini-name">{name}</span>
                    <span className="occasion-mini-note">{note}</span>
                  </div>
                  <Sticker
                    name={occasionSticker(theme)}
                    size="md"
                    className="occasion-mini-sticker"
                  />
                </li>
              ))}
            </ul>

            <div className="occasion-band-actions">
              <Link href={host ? "/host" : "/signup"} className="cta-primary">
                {host ? "Back to your events" : "Start your plan"}
              </Link>
              <span className="occasion-band-note">
                Takes a minute. Costs nothing.
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="page-shell">
        <footer className="landing-footer">
          <span>Spread</span>
          <span>Guests answer from a link. Hosts see the plan.</span>
        </footer>
      </div>
    </main>
  );
}
