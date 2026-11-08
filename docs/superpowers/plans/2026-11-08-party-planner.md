# Cookout Party Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone-first web app where a host shares one RSVP link, sees a trustworthy headcount, gets a scaled shopping list for their menu, and splits the bill with Venmo links.

**Architecture:** Next.js App Router + TypeScript. All food/headcount/money math is plain TypeScript in `src/domain/` (no framework imports) so a future mobile app can reuse it. Database access lives in `src/services/` and takes a `Db` argument, so tests run against an in-memory Postgres (PGlite) with no external setup. Pages call services through server actions.

**Tech Stack:** Next.js, TypeScript, Tailwind, Drizzle ORM, Postgres (Neon or Supabase in production; PGlite in tests and local dev), Better Auth (host email + password), Zod, Vitest + React Testing Library, Playwright, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-08-party-planner-design.md` (read its "Calls I made" section too).

## Global Constraints

- Phone-first and fast; guests open links from a group chat. E2E runs at a 390px-wide viewport.
- Guests never need an account, download, or login. Hosts do. Multiple independent hosts; each owns their events and recipes.
- Food math is plain TypeScript in `src/domain/`, separate from the screens.
- Quantities round **up** to buyable units (3 packs of 8 buns, not 2.9).
- Maybes count as a fraction of attendance; default **50%**, host-adjustable.
- Money is stored and computed in integer cents. The split must sum to the total exactly.
- No Venmo API exists. Only prefilled Venmo links; the host ticks "paid" manually.
- Look ("Backyard Cookout"): cream background `#FFF4DC`, ketchup red `#D7301F`, mustard yellow `#F5B700`, dark brown text and chunky outlines `#3A1F12`, dashed dividers `#E6D3A8`, serif display type (Georgia stack) for the wordmark and headings, Trebuchet MS stack for body, rounded cards, food emoji beside ingredients.
- Starter recipes are global and read-only; editing one makes a personal copy for that host.
- Out of scope: incentives for early RSVP, co-hosts, mobile app, taking payments, price lookup.

## Review Focus

Spec is silent on these; each has a test in the named task.

1. Zero headcount, zero attendees, zero servings: no divide-by-zero, empty/zero results (Tasks 3, 4, 5).
2. Money rounding: cents sum exactly to the total; host cover larger than total; negative or over-precise amounts rejected (Task 5, 13).
3. Wrong or foreign share code, edit token, or event id returns not-found and never another event's or host's data (Tasks 7, 10, 12).
4. Blank, whitespace-only, duplicate or overlong names, and absurd plus-one counts (caps are this plan's decision: name ≤ 80 chars, ≤ 10 plus-ones per guest) (Task 7).
5. A guest changes their answer after the host has begun shopping: quantities recalculate, ticked items and entered prices survive (Task 13).

---

### Task 1: Scaffold and test harness

**Files:**
- Create: Next.js app (App Router, `src/` dir, Tailwind, `@/*` alias), `vitest.config.ts`, `tests/smoke.test.ts`
- Modify: `package.json` scripts `test`, `test:watch`; keep the existing `.gitignore` entries

**Interfaces:**
- Produces: `npm test` (Vitest, jsdom, `@/` alias resolved), `npm run build`.

- [ ] **Step 1:** Scaffold with `create-next-app` into the existing repo root (use a temp dir and move files if it refuses a non-empty directory). Add `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.
- [ ] **Step 2:** Write `tests/smoke.test.ts` asserting `1 + 1 === 2`, and a component smoke test rendering `<div>hi</div>` under jsdom.
- [ ] **Step 3:** Run `npm test` — PASS; `npm run build` — succeeds.
- [ ] **Step 4:** Commit: `chore: scaffold next app and vitest`.

### Task 2: Cookout UI kit

**Files:**
- Create: `src/components/ui/{Wordmark,Pill,Card,Button,TabBar,Field}.tsx`, `src/components/ui/ui.test.tsx`
- Modify: `src/app/globals.css` (theme tokens as CSS variables from Global Constraints), `src/app/layout.tsx` (fonts, cream background, viewport meta)

**Interfaces:**
- Produces:
  - `Wordmark(): JSX` renders "Cookout" in red serif with a mustard "." 
  - `Pill({children, tone?: 'mustard'|'cream'})`, `Card({children, className?})` (white, 2px ink outline, rounded)
  - `Button({variant: 'red'|'mustard'|'outline', ...buttonProps})`
  - `TabBar({tabs: {label: string; href: string}[]; activeHref: string})` — active tab gets `aria-current="page"` and the red filled style
  - `Field({label: string, hint?: string, ...inputProps})`

- [ ] **Step 1:** Tests: `TabBar` sets `aria-current="page"` on only the tab whose href equals `activeHref`; `Button variant="red"` renders a `<button>` with accessible name; `Field` associates label to input (`getByLabelText`).
- [ ] **Step 2:** Run `npx vitest run src/components/ui` — FAIL.
- [ ] **Step 3:** Implement the components to match the approved mockups (host header with wordmark + "N coming" pill; red active tab with ink outline; white card with dashed row dividers).
- [ ] **Step 4:** Run tests — PASS. Commit: `feat: cookout ui kit`.

### Task 3: Headcount

**Files:**
- Create: `src/domain/headcount.ts`, `src/domain/headcount.test.ts`

**Interfaces:**
- Produces:
```ts
export type RsvpStatus = 'yes' | 'maybe' | 'no';
export interface HeadcountGuest { status: RsvpStatus; plusOnes: number }
export interface Headcount {
  confirmed: number;          // heads of 'yes' guests incl. plus-ones
  maybeHeads: number;         // heads of 'maybe' guests incl. plus-ones
  expectedFromMaybes: number; // maybeHeads * fraction, unrounded
  planFor: number;            // ceil(confirmed + expectedFromMaybes)
  low: number;                // = confirmed
  high: number;               // confirmed + maybeHeads
}
export function computeHeadcount(guests: HeadcountGuest[], maybeFraction?: number): Headcount; // default 0.5, clamped to [0,1]
```

- [ ] **Step 1:** Write failing tests:
  - 12 yes + 5 maybe, no plus-ones → `{confirmed:12, maybeHeads:5, expectedFromMaybes:2.5, planFor:15, low:12, high:17}`
  - yes with 2 plus-ones = 3 confirmed heads; maybe with 1 plus-one = 2 maybe heads; `no` with plus-ones contributes 0
  - empty list → all zeros (Review Focus 1)
  - fraction 0 → `planFor === confirmed`; fraction 1 → `planFor === high`; 1.5 clamps to 1; -1 clamps to 0
  - 100 maybe heads at fraction 0.07 → `planFor` 7, not 8 (float noise)
- [ ] **Step 2:** Run `npx vitest run src/domain/headcount` — FAIL.
- [ ] **Step 3:** Implement `computeHeadcount`; round `expectedFromMaybes` to 6 decimals before `ceil`.
- [ ] **Step 4:** Run — PASS. Delete `tests/smoke.test.ts`. Commit: `feat: headcount calculation`.

### Task 4: Recipes and shopping list

**Files:**
- Create: `src/domain/recipes.ts`, `src/domain/shopping.ts`, `src/domain/shopping.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
```ts
export interface RecipeItem {
  id: string; name: string; emoji: string;
  perServing: number; unit: string;      // amount per serving, in recipe units (e.g. 0.3333 'lb')
  buyUnit: string; unitsPerBuy: number;  // e.g. 'pack', 8 buns per pack
  priceCents: number;                    // per buy unit
}
export interface Recipe { id: string; name: string; emoji: string; defaultServingsPerPerson: number; items: RecipeItem[] }
export const STARTER_RECIPES: Recipe[];  // one recipe: id 'starter-burgers'
export interface DishPlan { recipe: Recipe; servingsPerPerson: number }
export interface ShoppingLine {
  itemId: string; recipeId: string; name: string; emoji: string;
  servings: number; needed: number; neededUnit: string;
  buyQty: number; buyUnit: string; unitsPerBuy: number; estCostCents: number;
}
export function buildShoppingList(dishes: DishPlan[], headcount: number): ShoppingLine[];
export function totalCents(lines: ShoppingLine[], actualByItemId: Record<string, number>, extrasCents: number[]): number;
```
Starter burger recipe (per burger, `defaultServingsPerPerson` 1.5): beef 1/3 lb (buy 1 lb, $6.50); buns 1 (pack of 8, $3.50); cheese 1 slice (pack of 24, $6.00); onion 1/6 (each, $1.00); jalapeño 1/4 (each, $0.50).

- [ ] **Step 1:** Failing tests:
  - burgers, headcount 15, 1.5/person → servings 23; buyQty beef 8, buns 3, cheese 1, onion 4, jalapeño 6; `totalCents(lines,{},[])` = 7550
  - changing beef `perServing` to 0.5 → beef buyQty 12
  - headcount 0, and servingsPerPerson 0 → every `buyQty` and `estCostCents` is 0 (Review Focus 1)
  - float guard: item `perServing 0.1`, `unitsPerBuy 0.3`, 3 servings → buyQty 1 (not 2)
  - `totalCents` with `{beefId: 6000}` override and extras `[1250]` → 9600
- [ ] **Step 2:** Run `npx vitest run src/domain/shopping` — FAIL.
- [ ] **Step 3:** Implement. `servings = ceil(headcount*servingsPerPerson - 1e-9)`; `buyQty = ceil(needed/unitsPerBuy - 1e-9)`; `estCostCents = buyQty*priceCents`.
- [ ] **Step 4:** Run — PASS. Commit: `feat: recipes and shopping list math`.

### Task 5: Money, split, Venmo links

**Files:**
- Create: `src/domain/money.ts`, `src/domain/split.ts`, `src/domain/venmo.ts`, `src/domain/split.test.ts`

**Interfaces:**
- Produces:
```ts
export function formatCents(cents: number): string;            // 7550 -> "$75.50"
export function parseDollarsToCents(input: string): number | null; // "$5" -> 500, "5.04" -> 504; null for "abc", "-3", "1.999"
export interface SplitGuest { id: string; name: string; heads: number; excluded: boolean }
export interface SplitShare { guestId: string; name: string; owedCents: number }
export interface SplitResult { shares: SplitShare[]; hostCoveredCents: number; chargedCents: number; unassignedCents: number }
export function computeSplit(totalCents: number, guests: SplitGuest[], hostCoverCents: number): SplitResult;
export function venmoPayLink(o: { username: string; amountCents: number; note: string }): string;
```
`heads` = 1 + plus-ones (the inviting guest covers their plus-ones). Excluded guests owe 0 and their heads are not counted.

- [ ] **Step 1:** Failing tests:
  - 7550 over 15 one-head guests: shares sum to 7550, max−min ≤ 1 cent, exactly five owe 504 and ten owe 503 (largest-remainder, ties by input order)
  - guests with heads 3,1,1 and total 1000 → 600/200/200
  - excluded guest owes 0 and others share the full charge
  - `hostCoverCents` 2000 on 7550 → `hostCoveredCents` 2000, `chargedCents` 5550; cover 99999 clamps to the total and everyone owes 0; negative cover treated as 0 (Review Focus 2)
  - no guests (or all excluded) → `shares` all 0/empty and `unassignedCents` equals `chargedCents` (Review Focus 1)
  - `venmoPayLink({username:'@WillCook', amountCents:504, note:'Burger Night: your share'})` equals `https://venmo.com/WillCook?txn=pay&audience=private&amount=5.04&note=Burger%20Night%3A%20your%20share`
  - money parse/format cases above
- [ ] **Step 2:** Run `npx vitest run src/domain` — FAIL for new files.
- [ ] **Step 3:** Implement the five functions (`encodeURIComponent` for the note; strip a leading `@` from the username).
- [ ] **Step 4:** Run — PASS. Commit: `feat: money, bill split, venmo links`.

### Task 6: Database schema, migrations, test database, starter seed

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `src/db/test-db.ts`, `src/db/seed.ts`, `src/db/db.test.ts`, `drizzle.config.ts`, `drizzle/` (generated)
- Modify: `package.json` scripts `db:generate`, `db:migrate`

**Interfaces:**
- Produces:
```ts
export type Db = PgDatabase<any, typeof schema>;   // src/db/client.ts; satisfied by postgres-js and PGlite drizzle instances
export function getDb(): Promise<Db>;               // DATABASE_URL set -> postgres-js; otherwise PGlite persisted in .data/pglite; singleton on globalThis; applies migrations when using PGlite and calls `seedStarterRecipes` once on first init
export function createTestDb(): Promise<Db>;        // src/db/test-db.ts: fresh in-memory PGlite with migrations applied
export function seedStarterRecipes(db: Db): Promise<void>;  // idempotent; inserts STARTER_RECIPES with owner_id null
```
Tables (all ids `text`, generated with `crypto.randomUUID()` except where noted; money in cents): `events` (id, hostId, title, startsAt, location, shareCode unique, maybePercent int default 50, venmoUsername null, hostCoverCents default 0); `recipes` (id, ownerId null = global, name, emoji, defaultServingsPerPerson real); `recipeItems` (id, recipeId, name, emoji, perServing real, unit, buyUnit, unitsPerBuy real, priceCents int, position); `eventDishes` (id, eventId, recipeId, servingsPerPerson real); `guests` (id, eventId, name, status enum yes/maybe/no, foodNotes null, editToken unique, attended bool, excluded bool, paid bool, linkSentAt null, createdAt); `plusOnes` (id, guestId, name); `invitees` (id, eventId, name); `shoppingState` (eventId, recipeItemId, checked bool, actualCents null; unique on both); `extraCosts` (id, eventId, label, amountCents). Better Auth tables are added in Task 9.

- [ ] **Step 1:** Failing test in `db.test.ts`: `createTestDb()` works; insert an event and read it back; `seedStarterRecipes` called twice yields exactly one global recipe with five items.
- [ ] **Step 2:** Run `npx vitest run src/db` — FAIL.
- [ ] **Step 3:** Add `drizzle-orm`, `drizzle-kit`, `postgres`, `@electric-sql/pglite`; write schema; run `npm run db:generate`; implement client, test-db (applies `drizzle/` migrations), seed (uses fixed ids from `STARTER_RECIPES`).
- [ ] **Step 4:** Run — PASS. Commit: `feat: database schema and test db`.

### Task 7: RSVP service

**Files:**
- Create: `src/services/errors.ts` (`NotFoundError`, `ValidationError`), `src/services/rsvp.ts`, `src/services/rsvp.test.ts`

**Interfaces:**
- Consumes: `Db`, `createTestDb`, schema.
- Produces:
```ts
export interface RsvpInput { shareCode: string; name: string; status: RsvpStatus; plusOneNames: string[]; foodNotes?: string }
export function submitRsvp(db: Db, input: RsvpInput): Promise<{ guestId: string; editToken: string }>;
export function updateRsvp(db: Db, input: RsvpInput & { editToken: string }): Promise<void>;
export function getGuestByToken(db: Db, shareCode: string, editToken: string): Promise<GuestView>;  // GuestView = {id,name,status,plusOneNames,foodNotes}
export function getPublicEvent(db: Db, shareCode: string): Promise<{ title: string; startsAt: Date; location: string; hostName: string; goingCount: number }>;
```

- [ ] **Step 1:** Failing tests (seed an event row directly):
  - `submitRsvp` stores guest + plus-ones; `editToken` is at least 32 URL-safe chars; two calls give different tokens
  - name is trimmed; blank/whitespace name, name over 80 chars, more than 10 plus-ones → `ValidationError`; blank plus-one names are dropped (Review Focus 4)
  - two guests both named "Alex" are both stored
  - unknown `shareCode` → `NotFoundError` (Review Focus 3)
  - `updateRsvp` with the right token changes maybe→yes and replaces plus-ones; wrong token, or a token from a different event, → `NotFoundError`
  - `getPublicEvent.goingCount` counts yes heads including plus-ones; the result has no guest names or notes
- [ ] **Step 2:** Run `npx vitest run src/services/rsvp` — FAIL.
- [ ] **Step 3:** Implement with Zod validation; token from `crypto.randomBytes(24).toString('base64url')`.
- [ ] **Step 4:** Run — PASS. Commit: `feat: rsvp service`.

### Task 8: Guest RSVP page

**Files:**
- Create: `src/app/e/[code]/page.tsx`, `src/app/e/[code]/g/[token]/page.tsx`, `src/app/e/[code]/actions.ts`, `src/components/RsvpForm.tsx`, `src/components/RsvpForm.test.tsx`

**Interfaces:**
- Consumes: `submitRsvp`, `updateRsvp`, `getGuestByToken`, `getPublicEvent`, UI kit.
- Produces: `RsvpForm({event, initial?: GuestView, action})`; cookie `cookout_g_<code>` holding the edit token (httpOnly, 1 year).

- [ ] **Step 1:** Component tests: tapping "Maybe" sets `aria-pressed` on it only; "+ add a guest" adds a name field; submit button is disabled while the name is blank; with `initial` the fields are prefilled and the button reads "Update my answer".
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Build the page to match the approved mockup (event title, "Hosted by … · N going so far", name, Yes!/Maybe/Can't buttons, plus-one names with the "so there's enough food" hint, optional food notes, mustard "Count me in"). The server action submits, sets the cookie, redirects to `/e/[code]/g/[token]`, which shows a confirmation and the prefilled edit form. `/e/[code]` redirects there when a valid cookie exists. Unknown code → `notFound()`.
- [ ] **Step 4:** Run tests — PASS; `npm run build` succeeds. Commit: `feat: guest rsvp page`.

### Task 9: Host auth

**Files:**
- Create: `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/(auth)/{login,signup}/page.tsx`, `src/server/auth.test.ts`
- Modify: `src/db/schema.ts` (Better Auth tables via its Drizzle adapter/CLI), `drizzle/` (regenerate)

**Interfaces:**
- Produces:
```ts
export interface Host { id: string; name: string; email: string }
export function getHostOrNull(): Promise<Host | null>;  // reads the session from request headers
export function requireHost(): Promise<Host>;           // redirects to /login when signed out
```
Env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

- [ ] **Step 1:** Test: `getHostOrNull()` returns `null` when the session lookup yields nothing (mock Better Auth's session call).
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Add `better-auth`; configure email + password with the Drizzle adapter on `getDb()`; write the two pages in the Cookout style; implement both helpers following Better Auth's current docs.
- [ ] **Step 4:** Run tests — PASS; `npm run build` succeeds. Commit: `feat: host email+password auth`.

### Task 10: Events service, dashboard, event shell

**Files:**
- Create: `src/services/events.ts`, `src/services/events.test.ts`, `src/app/host/page.tsx`, `src/app/host/new/page.tsx`, `src/app/host/events/[id]/layout.tsx` (header + `TabBar` Guests/Menu/Shopping/Split)

**Interfaces:**
- Produces:
```ts
export function createEvent(db: Db, hostId: string, i: { title: string; startsAt: Date; location: string }): Promise<{ id: string; shareCode: string }>;
export function listHostEvents(db: Db, hostId: string): Promise<EventSummary[]>;
export function getHostEvent(db: Db, hostId: string, eventId: string): Promise<EventRow>;  // NotFoundError if not this host's
export function addInvitees(db: Db, hostId: string, eventId: string, names: string[]): Promise<void>;
export function noReplyNames(db: Db, hostId: string, eventId: string): Promise<string[]>;  // invitees with no guest of the same trimmed, case-insensitive name
```
`shareCode`: 8+ URL-safe random characters, unique.

- [ ] **Step 1:** Failing tests: two events get different share codes; `listHostEvents` returns only that host's; `getHostEvent` for another host's id → `NotFoundError` (Review Focus 3); `noReplyNames` excludes an invitee once a guest named " alex " RSVPs for invitee "Alex"; blank invitee names dropped.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement services; dashboard lists events with a "Create event" button and a copyable share link (`/e/<code>`); event layout shows wordmark, title, "N coming" pill (`computeHeadcount(...).planFor`), and the tab bar.
- [ ] **Step 4:** Run — PASS; build succeeds. Commit: `feat: events service and host dashboard`.

### Task 11: Guests tab

**Files:**
- Create: `src/services/guestsOverview.ts`, `src/services/guestsOverview.test.ts`, `src/app/host/events/[id]/page.tsx` (Guests tab is the index)

**Interfaces:**
- Produces:
```ts
export function getGuestsOverview(db: Db, hostId: string, eventId: string): Promise<{ headcount: Headcount; counts: { yes: number; maybe: number; no: number }; guests: GuestRow[]; noReply: string[] | null }>;  // noReply null when no invitee list
export function setMaybePercent(db: Db, hostId: string, eventId: string, percent: number): Promise<void>;  // ValidationError outside 0..100 or non-integer
```

- [ ] **Step 1:** Failing tests: 12 yes + 5 maybe at 50% → `headcount.planFor` 15, `low` 12, `high` 17; `setMaybePercent(0)` makes `planFor` 12; 101 and 50.5 rejected; `noReply` is `null` with no invitees; other host → `NotFoundError`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; UI shows the breakdown line "12 confirmed + about 3 from maybes = plan for ~15 (range 12–17)", the maybe-percent control, guests with plus-ones and food notes, an optional invitee box, and the "no reply" list when present.
- [ ] **Step 4:** Run — PASS. Commit: `feat: guests tab`.

### Task 12: Menu tab

**Files:**
- Create: `src/services/menu.ts`, `src/services/menu.test.ts`, `src/app/host/events/[id]/menu/page.tsx`

**Interfaces:**
- Produces:
```ts
export function listRecipesForHost(db: Db, hostId: string): Promise<Recipe[]>;  // global starters + this host's own
export function addDishToEvent(db: Db, hostId: string, eventId: string, recipeId: string): Promise<{ dishId: string }>;
export function updateDish(db: Db, hostId: string, eventId: string, dishId: string, i: { servingsPerPerson: number; itemAmounts: Record<string, number> }): Promise<void>;
export function createCustomRecipe(db: Db, hostId: string, i: { name: string; emoji: string; defaultServingsPerPerson: number; items: Omit<RecipeItem, 'id'>[] }): Promise<{ recipeId: string }>;
export function removeDish(db: Db, hostId: string, eventId: string, dishId: string): Promise<void>;
```

- [ ] **Step 1:** Failing tests: adding the starter burgers sets `servingsPerPerson` 1.5; first `updateDish` on a starter recipe clones it for the host (starter row unchanged, event dish now points at the host-owned copy with the new beef amount), a second edit does not clone again; another host cannot add a dish to or edit this event (`NotFoundError`, Review Focus 3); `perServing` ≤ 0 and `servingsPerPerson` outside 0–20 → `ValidationError`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; UI: dish card with the emoji, appetite input ("1.5 burgers per person"), per-item amount inputs (patty weight is the beef amount), "Add a dish" from starters or a custom form.
- [ ] **Step 4:** Run — PASS. Commit: `feat: menu tab and recipe copies`.

### Task 13: Shopping tab

**Files:**
- Create: `src/services/shopping.ts`, `src/services/shopping.test.ts`, `src/app/host/events/[id]/shopping/page.tsx`

**Interfaces:**
- Consumes: `computeHeadcount`, `buildShoppingList`, `totalCents`, menu service.
- Produces:
```ts
export interface ShoppingPlan { headcount: Headcount; lines: (ShoppingLine & { checked: boolean; actualCents: number | null })[]; extras: { id: string; label: string; amountCents: number }[]; totalCents: number }
export function getShoppingPlan(db: Db, hostId: string, eventId: string): Promise<ShoppingPlan>;
export function setChecked(db: Db, hostId: string, eventId: string, recipeItemId: string, checked: boolean): Promise<void>;
export function setActualCost(db: Db, hostId: string, eventId: string, recipeItemId: string, cents: number | null): Promise<void>;
export function addExtraCost(db: Db, hostId: string, eventId: string, label: string, cents: number): Promise<void>;
export function removeExtraCost(db: Db, hostId: string, eventId: string, extraId: string): Promise<void>;
```

- [ ] **Step 1:** Failing tests: event with 12 yes + 5 maybe and starter burgers → lines beef 8 lb, buns 3, cheese 1, onions 4, jalapeños 6 and `totalCents` 7550; `setChecked` and `setActualCost` persist and change the total; adding extras adds to the total; negative or non-integer cents → `ValidationError` (Review Focus 2); **after ticking beef and entering an actual price, a new guest RSVPs "yes" with 2 plus-ones: quantities rise, beef stays ticked and keeps its actual price** (Review Focus 5); event with no dishes → empty `lines`, total equals extras.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; UI per the mockup: header line "12 yes + ~3 from maybes · range 12–17" (`planFor − confirmed` for the "~3"), ingredient card with checkboxes, quantities like "8 lb" and "3 packs", editable price per line, "range" note beside the beef line, extras list, red total card.
- [ ] **Step 4:** Run — PASS. Commit: `feat: shopping tab`.

### Task 14: Split tab

**Files:**
- Create: `src/services/split.ts`, `src/services/split.test.ts`, `src/app/host/events/[id]/split/page.tsx`

**Interfaces:**
- Consumes: `getShoppingPlan`, `computeSplit`, `venmoPayLink`.
- Produces:
```ts
export interface SplitRow { guestId: string; name: string; attended: boolean; excluded: boolean; paid: boolean; linkSentAt: Date | null; heads: number; owedCents: number; venmoUrl: string | null }
export function getSplitView(db: Db, hostId: string, eventId: string): Promise<{ rows: SplitRow[]; totalCents: number; hostCoveredCents: number; unassignedCents: number; venmoUsername: string | null }>;
export function setAttended(db: Db, hostId: string, eventId: string, guestId: string, v: boolean): Promise<void>;
export function setExcluded(db: Db, hostId: string, eventId: string, guestId: string, v: boolean): Promise<void>;
export function setPaid(db: Db, hostId: string, eventId: string, guestId: string, v: boolean): Promise<void>;
export function markLinkSent(db: Db, hostId: string, eventId: string, guestId: string): Promise<void>;
export function setHostCover(db: Db, hostId: string, eventId: string, cents: number): Promise<void>;
export function setVenmoUsername(db: Db, hostId: string, eventId: string, username: string | null): Promise<void>;
```
Heads for an attending guest = 1 + their plus-ones.

- [ ] **Step 1:** Failing tests: only attended guests owe anything and shares sum to the shopping total; a guest with 2 plus-ones owes 3 shares; excluding a guest redistributes; `venmoUrl` is `null` until a username is set, then matches `venmoPayLink`; zero attended → no owed amounts and `unassignedCents` equals the charge; `paid` and `linkSentAt` persist; every function with another host's id → `NotFoundError`.
- [ ] **Step 2:** Run — FAIL.
- [ ] **Step 3:** Implement; UI per the design: "Tick who came" list, total and "about $X each", host-cover and Venmo-username fields, per-guest "Send Venmo link" (opens the link and calls `markLinkSent`) and a paid checkbox. Empty state when nobody is ticked.
- [ ] **Step 4:** Run — PASS. Commit: `feat: split tab with venmo links`.

### Task 15: End-to-end test, README, deploy config

**Files:**
- Create: `playwright.config.ts` (single project, 390×844 viewport), `e2e/flow.spec.ts`, `README.md`

- [ ] **Step 1:** Write `e2e/flow.spec.ts`: host signs up and creates "Burger Night"; reads the share link; in a fresh browser context a guest RSVPs "Yes" with one plus-one; host's Guests tab shows 2 confirmed; Shopping tab beef line is "1 lb" (2 heads × 1.5 = 3 burgers × 1/3 lb); the host ticks the guest attended on the Split tab and sees an owed amount; the guest reopens their link and changes to "Can't", and the host's count drops to 0.
- [ ] **Step 2:** Run `npx playwright test` — FAIL until the app is wired; fix any integration gaps it reveals.
- [ ] **Step 3:** README: local dev (no env needed; PGlite in `.data/`), env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), `npm run db:migrate`, seeding starter recipes on boot, deploying to Vercel with a Neon or Supabase database, and a note to confirm the Venmo link format on a phone.
- [ ] **Step 4:** Run `npm test && npm run build && npx playwright test` — all pass. Commit: `test: end-to-end flow and docs`.
