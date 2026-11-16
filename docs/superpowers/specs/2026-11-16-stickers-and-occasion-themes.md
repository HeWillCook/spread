# Stickers, washi tape and occasion themes

Date: 2026-11-16. Status: approved (directions 2 and 3 combined). This supersedes the site-wide fire in `2026-11-15-fire-identity.md`; that spec's layout work (two-pane pages, sticky asides, Today/Edit layouts, shared EmptyState, the dashboard grid) stays.

## Why

The flames clash with Spread's sweet, papery order tickets, and Spread is for every kind of get-together, not just cookouts. The new identity has two layers:

1. **A shared scrapbook base, on every page.** Hand-drawn stickers slapped on at slight angles, washi tape holding paper to the page, a paper bunting garland, and gingham picnic-blanket bands. This replaces the coal/grill bands and fills the empty space.
2. **A theme for each occasion, derived from the event's cover emoji.** The event masthead, the guest page, the dashboard ticket, the empty states and the "You're in!" moment all pick up that occasion's motion. Fire survives only as the cookout theme.

## Base layer primitives (`src/components/scrapbook/`)

All are decorative, `aria-hidden`, server-renderable, deterministic (no Math.random at render), CSS-only motion that animates only transform and opacity. Static under `prefers-reduced-motion`; hidden in print.

- **`Sticker`**: `name` prop picks an inline SVG illustration. Style: flat, friendly line-and-fill drawing in the existing palette (ketchup, mustard, pickle, charcoal, cream), a thick white die-cut outline (stroke or offset path), and a small soft drop shadow (`drop-shadow(0 2px 0 rgb(43 29 23 / .15))`). Props: `size` (sm 40px / md 64px / lg 96px), `tilt` (deg, default from a seeded table), `peel` (boolean; on mount it peels on: scale .6 → 1.05 → 1 with a slight rotate, once). Set (keep each drawing simple, ~10–20 path elements max): `watermelon`, `sun`, `balloon`, `lantern`, `cake`, `burger`, `pizza`, `taco`, `glasses`, `pumpkin`, `tree`, `basket`, `mug`, `dice`, `butterfly`, `ant`, `leaf`, `snowflake`, `star`, `heart`.
- **`WashiTape`**: a translucent strip (about 80×22px) with a pattern (`stripe`, `dots`, `gingham`, `plain`) and torn ends (a jagged clip-path), tilted. Used to "hold" the top corners or centre of tickets and stubs. Colours: mustard/ketchup/pickle-soft at about 70% opacity, so the paper shows through.
- **`Bunting`**: a garland of triangular paper flags on a gently sagging string (an SVG path). It spans its container. Flags alternate palette colours, some with gingham or dot fills. Each flag sways slightly (rotate ±3° around its top, staggered 3–5s). Props: `count`, `variant` (`flags` triangles, or `picado` for the fiesta theme, with rectangular cut-paper flags with simple cutouts).
- **`Gingham`**: a CSS background utility (`.gingham`, `.gingham-soft`). Classic picnic check made from two overlapping semi-transparent linear-gradients in ketchup on cream, plus a soft mustard and a sage variant. Optional scalloped edge (`.scallop-bottom`, a radial-gradient mask) like a tablecloth hem.

## Occasion themes (`src/lib/occasion.ts` + `src/components/occasion/`)

`occasionFor(coverEmoji)` returns a theme key. Add three covers to `COVERS` in `src/lib/cover.ts`: `🧺 Picnic basket`, `☕ Coffee`, `🎲 Game die`. (`cover_emoji` is a plain text column validated by `z.enum(COVER_EMOJI)`, so no migration is needed. Update `cover.test.ts` if it pins the list.)

| Cover | Theme | Ambient motion (in a contained scene) | Burst on success |
| --- | --- | --- | --- |
| 🎉 | `party` | confetti drifting down slowly | confetti pop |
| 🍔 | `cookout` | small flame bed + embers (reuse `src/components/fire/`), kept small | embers |
| 🎂 | `birthday` | three candles with flickering flames + sprinkles | confetti + stars |
| 🍕 | `pizzeria` | red gingham tablecloth with steam wisps curling up | steam puffs |
| 🌮 | `fiesta` | papel picado bunting swaying | confetti |
| 🥂 | `toast` | bubbles rising + twinkling string lights | bubbles |
| 🎃 | `harvest` | autumn leaves tumbling | leaves |
| 🎄 | `holiday` | gentle snowfall + twinkle lights | snowflakes |
| 🧺 | `picnic` (default for unknown or no cover) | gingham blanket, a line of ants marching, a butterfly fluttering | butterflies |
| ☕ | `brunch` | steam curling from a mug | hearts |
| 🎲 | `gamenight` | two dice tumbling and settling every few seconds | stars |

Components:
- **`OccasionScene`**: `theme` + `size` (`strip` ~56px tall, `panel` fills its container). Contained, `overflow: hidden`, 8–16 particles max for a strip, sized for the container.
- **`OccasionBurst`**: one-time burst on mount (about 1.2s, 10–16 particles), absolutely positioned over its parent.
- Each theme has a matching `Sticker` (for example, holiday → tree, picnic → basket).

## Where things go

- **Remove site-wide fire**: the coal `GrillBand` everywhere, the wordmark ember period (back to a mustard period; it may get a tiny one-time wobble on hover), the button heat sweep (replace with a gentle press: translateY(1px) plus the existing inset base on active, and a 2° wiggle on hover is fine), the tab shimmer (back to a solid ketchup bar; on event pages it can take the theme accent), and the "Plan for" glow. Delete `GrillBand`/`GrillMarks` and the unused fire CSS. Keep `Flames`, `Embers`, `FlameIcon` and `EmberBurst` only for the cookout theme. Update the cover chip so it no longer uses grill marks.
- **Landing (`src/app/page.tsx`)**:
  - Bunting garland across the top of the hero.
  - Washi tape holding the example ticket to the page. Keep its print-down animation, but replace the coal slot bar with a paper/tape treatment.
  - 4–5 stickers scattered around the ticket (watermelon, sun, balloon, cake, lantern), peeling on in sequence.
  - Restyle the stamp row as paper labels.
  - Replace the closing grill band with a gingham blanket section (scalloped top edge) titled something like "For every kind of get-together." It holds a row of 5–6 mini tickets showing different occasions (picnic, birthday, holiday, game night, toast, cookout), each with its own small `OccasionScene` strip and sticker. This is the rotating mix that says "any occasion". Keep the existing CTA copy and links. The e2e test locates "Host a get-together" and "Go to your events" strictly, so don't duplicate those names; keep "Start your plan" / "Back to your events".
- **Two-pane pages (login, signup, new event)**: the left panel becomes a gingham blanket with bunting across the top, 3–4 stickers, and the headline on a paper label held by washi tape. Rewrite the headlines without grill talk (for example, login "Good to see you again.", signup "Every get-together starts here.", new event "What are we celebrating?"). The new-event panel shows a live preview of the chosen cover's theme if that's simple (the picker is a client component; the theme can switch with the selected emoji). Otherwise, show a sticker collage.
- **Guest RSVP (`/e/[code]`, `/g/[token]`)**: the left panel is that event's `OccasionScene` (panel size) behind the title label. "You're in!" fires `OccasionBurst` for the theme. The mobile strip uses the `strip` scene.
- **Dashboard**:
  - The header sits on a soft gingham band with bunting instead of coal.
  - Each event ticket gets washi tape on top and its theme sticker peeking off a corner.
  - The "Plan another" dashed ticket (rename from "Fire up another") has a cluster of three faded stickers.
  - The empty state uses the basket/picnic art with the ants marching.
- **Event masthead**: replace the coal flame strip with the event's `OccasionScene` strip (about 48–56px) across the top of the ticket, clipped to the ticket width. Washi tape holds the invite stub. The cover chip stays as is.
- **Empty states (`EmptyState.tsx`)**: art becomes sticker compositions (guests → ticket + balloon; menu → basket; shopping → bag/cart drawn as a sticker; split → two glasses; today → sun + star; dashboard → picnic basket with ants marching). Keep the copy verbatim.
- **404**: "The ants ran off with this page." A picnic blanket scene with a line of ants carrying a tiny ticket off-screen (looping march). One short line, then the CTA home.
- **ChangeNotice / success**: use `OccasionBurst` for the event's theme where the theme is known; otherwise use confetti.

## Docs

Rewrite DESIGN.md: replace the Fire section with "Scrapbook and occasions" (the base layer, the theme table, and the rule that fire belongs only to the cookout theme). Update tokens, and update Motion (ambient loops only inside occasion scenes and bunting; reduced motion gets static scenes; print strips all of it).

## Out of scope

Don't add npm dependencies, change data except the three new covers, or touch the dev Guest lab.
