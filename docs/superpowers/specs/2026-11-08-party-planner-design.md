# Party Planner ("Cookout") — Design

Working name: **Cookout.** (Placeholder; the name is not decided.)

## Intent and why

The host (Will) throws parties and sends RSVP invites into several group chats. Two things go wrong every time:

1. **Nobody knows the real headcount.** Lots of "maybe"s that don't resolve until the day of, and guests bring friends the host never hears about. The host buys food on a guess.
2. **Nobody knows how much to buy.** The last party had no recipe. The host had a pile of meat and no idea how many burgers it made or how much onion, jalapeño and cheese to buy. The outcome is leftovers or running out.

Cookout turns a headcount into a shopping list the host can trust, and splits the cost afterwards. The calculation flows in one direction: **headcount → burgers → pounds of meat → toppings and extras → cost → per-person split.** Decided by the host: the hard problem last time was deciding how much meat to buy because the headcount was unknown. The calculation starts from headcount, not from meat on hand.

## Goals

- Guests RSVP from a link pasted into a group chat: no account, no download, one tap.
- The host sees one headcount number they can plan around, including an estimate for the "maybe"s.
- Recipes say how much of each ingredient goes into one serving. The app scales them to the headcount and outputs a shopping list in buyable units (packs, pounds, whole onions), with estimated cost.
- The host can tune appetite (servings per person) and portion size (patty weight).
- The bill splits among the people who came, with one-tap Venmo links.
- Built to grow: multiple hosts, each with their own events and recipes, not a single-user toy.

## Non-goals (for now)

- **Incentivizing early RSVPs.** Explicitly set aside by the host. Ideas discussed and parked (not requirements): a hard food-lock deadline (host said too strict), early-bird menu picks, group-unlock progress bars, points and streaks, live "who's in" list, smarter reminders. May return later.
- A native mobile app. Web first. Keep the door open (see Constraints).
- Taking payments or holding money.
- Grocery-store price lookup or ordering.

## Anti-goals

- Making guests create accounts or install anything just to answer an invite.
- A hard-deadline or punishing mechanic ("no RSVP, no food"); the host felt it was too strict for their friends.
- A shopping list that is confidently wrong. Better to show an uncertainty range than false precision.

## What the host decided

### Platform and stack (host chose "web app first"; the rest is my recommendation, which the host did not object to but has not specifically approved)
- Web app that works well on a phone browser. Mobile app later.
- Suggested: Next.js (React) + TypeScript, hosted Postgres (Supabase or Neon), deployed on Vercel.
- The food-math module is plain TypeScript, separate from the screens, so a later mobile app (e.g. React Native) can reuse it.

### Screens
**Host's event page: tabs layout** (chosen over a single scrolling page): `Guests | Menu | Shopping | Split`.
- **Guests:** counts of yes / maybe / no (and "no reply" only if the host added an invitee list; see "Calls I made"), plus guest names with plus-ones.
- **Menu:** what's being served, appetite (e.g. 1.5 burgers per person), portion size (e.g. 1/3 lb patties).
- **Shopping:** list scaled to the plan. Checkboxes to tick off as you buy. Shows the "planning for ~N people" number and says how it was reached.
- **Split:** total, per-person amount, who's been sent a Venmo link, and who has paid (manual checkbox).

**Guest RSVP page (reached via link):**
- Name, Yes / Maybe / Can't, "Bringing anyone?" (names of plus-ones), optional allergies or food notes.
- Guests can reopen the same link and change their answer.
- Host approved this page as shown in the mockup.

### Visual identity
**"Backyard Cookout":** warm retro-diner feel. Cream background, ketchup red (#D7301F), mustard yellow (#F5B700), dark brown text and chunky outlines (#3A1F12), serif display type for the wordmark, rounded cards, food emoji next to ingredients. Friendly and a little silly. Approved from mockups in `.superpowers/brainstorm/` (not committed). Key reference shapes: header with wordmark and "N coming" pill; red active tab; white ingredient card with dashed dividers; red total card.

### Headcount logic
- Headcount = confirmed yeses (including named plus-ones) + an estimate for the "maybe"s.
- Maybes count as a fraction. Starting default (my call): 50%, adjustable by the host.
- Later improvement the host liked: learn from history how often each person's "maybe" turns into attendance.
- Show the host the breakdown ("12 confirmed + about 3 from maybes = plan for ~15").

### Food math
- Recipes define per-serving amounts. Burger example: patty weight, cheese slices, onion, jalapeño, bun.
- The app ships with starter recipes for common party foods (burgers first). The host can edit amounts and add their own.
- Output is rounded up to buyable units (3 packs of 8 buns, not 2.9).
- Illustrative numbers shown to the host (not requirements): 15 people × 1.5 burgers = 23 burgers; 1/3 lb patties = about 8 lb beef; 1 cheese slice per burger; about 1 onion per 6 burgers; about 1 jalapeño per 4 burgers; 3 packs of 8 buns.

### Bill split
- Total of the shopping list (prices entered by the host), divided evenly among the people who came.
- Host can cover part of it or exclude some people (e.g. kids). Evenly split is the default.
- **Venmo:** there is no public Venmo API, so the app cannot create Venmo groups or see payments. Plan: generate a prefilled Venmo link per guest (host as recipient, amount, note). The host marks people as paid manually. Alternatives noted: PayPal.me and Cash App links. This is from my knowledge and should be re-checked at build time.

## Constraints

- Phone-first and fast, since guests open links from a group chat.
- Guests never need an account. Hosts do (multi-host from the start).
- Keep food math independent of the UI for later reuse in a mobile app.

## Calls I made (after a builder review; please check these)

These were gaps the reviewer found. The host did not decide them. I settled each one with a sensible default.

1. **One shared event link, not one link per guest.** The host pastes a single link into every group chat. A guest enters their name and answers. After answering, the guest's browser remembers them, and they also get a personal edit link to change their answer later. Because the app doesn't know who was invited, the "no reply" count only appears if the host chooses to add an optional list of expected invitees by name. Without that list, the Guests tab shows only yes / maybe / no.
2. **Plus-ones take the inviting guest's status and cost.** A plus-one added by a "maybe" counts as a maybe at the same fraction; one added by a "yes" counts as a yes. Plus-ones are entered by name. By default the inviting guest covers the plus-one's share, so they get one Venmo link for the group's amount. The host can change this.
3. **The split uses actual spend.** Shopping prices are estimates at first. After shopping, the host can enter real prices (defaulting to the estimates) and add extra costs not on the list (drinks, charcoal, ice). The split recomputes from that total and from who the host ticked as attended.
4. **"Multiple hosts" means independent hosts**, each owning their own events and recipes. Co-hosts on one event are a later feature. Starter recipes are global and read-only; editing one makes a personal copy.
5. **Uncertainty is shown as a range on the Guests tab.** Low = confirmed only; high = all maybes show. The shopping list uses the single "plan for ~N" estimate, with the range noted beside the biggest items (meat).
6. **First version includes all four tabs**, but with a starter recipe set kept small (burgers first). Hosts can edit amounts in a recipe and add custom dishes. Anything beyond that (co-hosts, history-based maybe-reliability, incentives, mobile app) comes later.

## Left to the builder

- Data model, auth approach for hosts, hosting details, database choice (Supabase vs Neon), testing approach.
- How a guest's personal edit link is secured (an unguessable token is the likely approach).
- Exact rounding rules, default ratios for the starter recipes, units handling.
- How prices get entered (manual per item for now).
- Naming and final copywriting.
- What "attended" means for the split (host ticks who showed up) and how the split behaves if it changes.

## Out of scope but flagged for later

- Incentive features (see Non-goals).
- Mobile app.
- Learning maybe-reliability from past events.
