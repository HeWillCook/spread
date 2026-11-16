# Light the grill: fire identity and fuller pages

Date: 2026-11-15. Status: approved direction ("Light the grill").

Spread keeps its butcher paper and order tickets (see DESIGN.md). This pass adds fire as the second voice of the brand, and fills the empty space that screenshots showed on almost every page.

## Brand idea

The tickets stay on the counter. The grill is lit behind it. Charcoal bands with live flames and rising embers frame the pages; the paper stays calm and readable. Fire appears in chrome, empty states and moments of success, never inside forms or data rows.

## New tokens (globals.css `:root` + `@theme inline`)

- `--coal: #1a110c` (darkest grill), `--coal-2: #2b1d17` (= ink), `--coal-3: #3a2820`
- `--ember: #ff6b1a`, `--flame: #ffb43a`, `--flame-tip: #ffe08a`
- `--glow: 0 0 24px rgb(255 107 26 / 0.45)`
- Grate pattern: `--grate` repeating-linear-gradient of 3px coal-3 bars every 18px.

Text on coal uses `--paper`. Contrast must stay at or above WCAG AA.

## Fire primitives (new files in `src/components/fire/`)

All decorative, `aria-hidden="true"`, server-renderable (no client JS needed), CSS-only animation, deterministic (no Math.random at render, so no hydration mismatch).

1. **`Embers`**: absolutely positioned layer of N small glowing dots (default 14). Each gets inline CSS vars `--x`, `--size`, `--dur`, `--delay`, `--drift` from a fixed seeded table. Keyframe `ember-rise`: translateY(0 → -140px), translateX(drift), opacity 0 → 1 → 0, scale shrinking. Colours alternate flame and ember with a box-shadow glow.
2. **`Flames`**: a row of layered SVG flame tongues (3 layers: ember, flame, flame-tip) that tiles horizontally along the bottom or top edge of a container. Keyframe `flicker`: scaleY 0.85 ↔ 1.08, small skewX, with `transform-origin: bottom`, and staggered durations (1.1–1.9s) per tongue so it never looks looped.
3. **`GrillBand`**: a coal surface with the grate pattern, a warm radial glow from the bottom, `Flames` along one edge (prop `edge="top" | "bottom"`), and `Embers` rising. Takes children (headline content). Rounded 8px when inset, square when full-bleed.
4. **`FlameIcon`**: a small inline SVG flame (16–24px) with a subtle flicker. Used in the wordmark, success notices and the empty states.
5. **`GrillMarks`**: two or three diagonal seared stripes (a CSS gradient) used as a quiet texture on cover chips and empty-state art.

**Reduced motion** (`prefers-reduced-motion: reduce`): embers hidden, flames still at full height, no glow pulses. Everything must look finished without motion.

**Performance:** animate only `transform` and `opacity`. Use no JS animation loops and no canvas.

## Where fire goes

- **Wordmark**: the mustard period becomes a small glowing ember that slowly breathes (opacity and glow, 3s). Add a `FlameIcon` next to the toast logo only on the landing header.
- **Primary button**: on hover, an ember gradient sweeps across (background-position transition) and a soft glow appears. The pressed-key inset shadow stays. On focus, the existing outline.
- **Active tab bar**: the 5px ketchup bar becomes a ketchup → ember → flame gradient with a slow shimmer (background-position) and a faint glow.
- **"Plan for" big numbers** (event masthead, dashboard tickets, landing example): a gentle heat glow (text-shadow pulse, 4s) in ketchup/ember.
- **Landing**:
  - The dark slot bar above the example ticket becomes a hot coal bar with flames licking up behind it. The ticket still prints down out of it.
  - Add a full-bleed `GrillBand` footer section above the existing footer, with a big slab line ("Fire up the grill. We'll count the buns."), the primary CTA and embers. This fills the dead band and gives the page an ending.
  - Fill the empty space under the hero CTA with a row of three stamp-style stats or steps ("1 link", "0 accounts", "every bun counted"), using the slab font and grill-mark texture.
- **Dashboard `/host`**: the header ("Your events", greeting, Create event) sits inside an inset `GrillBand` with flames along its bottom edge. The events grid becomes 1/2/3 columns (sm/lg/xl). After the event tickets, add a dashed "Fire up another" ticket that links to `/host/new`, so rows look full. Redesign the empty state as a large illustrated one (see Empty states).
- **Event masthead** (`host/events/[id]/layout.tsx`): add a thin coal strip with small flames along the top of the ticket (it's on the grill), and give the cover chip grill marks. Keep the layout otherwise.
- **Success moments**: the "You're in!" guest banner and change notices get a `FlameIcon` plus a one-time burst of embers on mount (CSS only, runs once).

## Filling empty space

- **Auth (`/login`, `/signup`), `/host/new`, guest RSVP `/e/[code]` and `/e/[code]/g/[token]`**: at `lg` and up, use a two-pane layout. On the left is a tall `GrillBand` (sticky, full viewport height minus padding) with a big slab headline that fits the page, flames along the bottom and embers. On the right is the existing slip. For the guest page, the headline is the event title, date and host's cover. Below `lg`, the band collapses to a short strip (about 140px) above the slip.
- **404 (`not-found.tsx`)**: a full-page grill scene. A grate illustration with flames, a slab headline "This one fell through the grate.", a short line and the CTA home. Embers rise across the viewport.
- **Event tabs with a 320px summary column** (Guests, Menu, Shopping, Split): make the right column `lg:sticky lg:top-[tabs height + 1rem] lg:self-start` so it travels with the long list instead of leaving a void. Where the left column is an empty state, the empty state fills the column height (see below).
- **Today**: replace the 3-column grid with a CSS multi-column (masonry) layout or put Timeline and Make in one stacked column beside Still to buy, so columns balance. No blank 1000px.
- **Edit event**: two columns at `lg`. The form is on the left, and Cancel event and Danger zone are on the right, sticky.
- **Empty states**: add a new shared `src/components/EmptyState.tsx` (props: `title`, `children` body, optional `action`, `art: "grill" | "ticket" | "cart" | "split" | "calendar"`). It is a paper card with a min-height of about 280px, centred content and a slab title. The art is a simple inline SVG (a line-art grill with a flickering `FlameIcon`, a ticket stub, a shopping bag, and so on) in charcoal with ember accents. Faint grill marks sit in the background. Replace the hard-coded empty states in: `GuestsPanel.tsx`, `menu/MenuPanel.tsx`, `shopping/ShoppingPanel.tsx`, `shopping/ExtrasCard.tsx` (keep it compact here, `size="sm"`), `split/SplitPanel.tsx`, `prep/KitchenSheet.tsx` (no flames in print), `today/TodayChecklist.tsx`, and `host/page.tsx` "No events yet". Keep the existing copy and any test-asserted text exactly.

## Out of scope

No data or behaviour changes. Do not add npm dependencies. The dev-only Guest lab is untouched. Print styles must strip all fire (white paper rule in DESIGN.md).

## Docs

Update DESIGN.md: add the fire tokens, the "Fire" section (where fire may and may not appear) and the rewritten Motion section (ember/flame loops are allowed in chrome bands and empty-state art; reduced motion gets static flames).
