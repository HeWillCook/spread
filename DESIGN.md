---
name: Spread
description: Smokehouse order tickets on pink butcher paper, for casual hosts.
colors:
  butcher-paper: "#efd3c1"   # page (token: cream)
  ticket: "#fffaf4"          # working surfaces (token: paper)
  stub: "#fff3df"            # ticket stubs holding links
  ketchup: "#c4301a"
  ketchup-deep: "#9e2411"
  mustard: "#f2b01e"
  pickle: "#3e6a33"
  charcoal: "#2b1d17"        # token: ink
  charcoal-muted: "#6a4636"  # token: ink-muted
  coal: "#1a110c"            # darkest grill, token: coal
  coal-2: "#2b1d17"          # same value as ink, token: coal-2
  coal-3: "#3a2820"          # grate bars, token: coal-3
  ember: "#ff6b1a"
  flame: "#ffb43a"
  flame-tip: "#ffe08a"
  divider: "#ead6c7"
  divider-strong: "#cfa58c"
typography:
  display:
    fontFamily: "Alfa Slab One (next/font), Rockwell, serif"
    weight: 400 (single heavy weight; never synthesise bold)
  body:
    fontFamily: "Archivo (next/font, variable with wdth axis)"
  ticket-number:
    fontFamily: Archivo
    fontStretch: "62%"
    fontWeight: 800
    color: ketchup
rounded:
  control: "6px"
  surface: "8px"
  ticket: "6px top corners, zigzag foot"
---

## Overview

Spread looks like the counter of a backyard smokehouse: pink butcher paper underneath, and the plan printed on order tickets. The **ticket** is the one bold object. It appears as the event header (title, then the headcount printed large like a deli order number, then a perforated stub holding the invitation link), the guest RSVP slip, the sign-in and new-event slips, the dashboard event tickets, the landing-page example, and the running-total receipt. Everything around the ticket stays quiet: flat paper surfaces, no borders, no decorative shadows.

## Colors

Butcher paper (`--cream`) is the page and carries a faint fibre texture (`--grain`). Ticket paper (`--paper`) holds working content. Ketchup marks primary actions, the active tab bar, and large numbers. Mustard marks "maybe" and food-note accents. Pickle marks "going". "Can't" and secondary tags are outlined in muted charcoal. Text on ketchup uses ticket paper, never the page colour.

## Typography

Alfa Slab One sets every heading and the wordmark. It has one heavy weight, so `font-synthesis: none` is applied and headings use weight 400. Archivo sets body copy, labels and controls. Large counts (plan for, totals) use Archivo at `font-stretch: 62%`, weight 800, tabular numerals, in ketchup. Labels are sentence case: no all-caps eyebrows.

## Layout

Shells are at most 64rem wide. Event screens open with the ticket, then sticky text tabs over a 2px charcoal rule, with a 5px ketchup bar under the current tab. At 1024px and up, task content uses a list beside a 320px summary column that sticks below the tabs. Guest, sign-in, new-event and RSVP screens are two panes: a tall sticky coal band with the page's headline on the left, and the slip on the right; below 1024px the band becomes a short strip above the slip. The dashboard grid is one column, then two from 640px; it never crowds three cards into the 64rem shell.

Today stacks Timeline and Make beside Still to buy, so the day does not leave a column blank. Edit details keeps the form on the left and the cancellation and delete controls on the right, sticky.

Empty states are paper cards with a slab title, a line of body copy and a simple line-art grill, ticket, cart, split or calendar in charcoal with an ember accent. They fill the column they sit in.

## Motion

Two loops belong to the chrome, both decorative and both CSS-only. Embers drift up through coal bands, and flame tongues flicker along their edges with staggered timing so a row never looks looped. The active tab bar carries a slow shimmer, the wordmark's ember period breathes, and primary buttons answer hover with one ember sweep and a soft glow. Nothing moves inside a form, a data row or a table.

The one orchestrated page moment is still the landing example printing down out of its coal slot. Success notices may burst embers once on mount. Fire is there to frame the paper, so the loops stay slow, low and at the edges.

`prefers-reduced-motion: reduce` removes embers, stills flames at full height and stops every loop; the design must look finished without motion. Print strips all fire.

## Fire

The grill is lit behind the counter. Coal, ember and flame are chrome, never content: they frame pages and mark moments while the paper stays calm and readable.

- Fire appears in bands and edges: the dashboard header, the coal strip on top of the event ticket, the slot above the example plan, the landing close, the two-pane sign-in and guest screens, the 404 and empty-state art.
- The fire bed is continuous: overlapping tongues in two depths over a glowing coal strip, never a row of separated drops. Tall tongues stay behind shorter, brighter ones.
- Fire never enters a form, a data row, a table, the kitchen sheet or anything printed. Decorative layers are `aria-hidden`, CSS-only and deterministic, so they render identically every time.
- Text on coal uses `--paper`. Muted copy on coal is paper at 80% or more; never set ketchup or mustard body copy on coal.
- Grill marks are a quiet texture on cover chips, stamps and empty-state art, and stay under about a quarter tint.
- Stamps are the one place fire meets a statistic: a slab figure on a paper stamp with faint marks, slightly rotated, never more than three in a row.

## Shapes

Controls are 6px; surfaces are 8px; tags are fully round. Tickets have a CSS zigzag foot (a conic-gradient strip) and perforations (2px dashed rule with half-circle notches cut in the page colour).

## Components

Buttons and fields are at least 44px tall. Primary buttons are ketchup with a 3px inset base shadow, like a pressed key; outline buttons use a 1.5px charcoal border. Focus is a 2px charcoal outline with 3px offset.

## Do's and Don'ts

- Do distinguish a planning estimate from confirmed attendance.
- Do keep food notes visible during menu and shopping tasks, with an explanation that they do not automatically alter the recipe.
- Do preserve recorded expenses and paid flags when quantities change; flag the review needed. For paid guests, ask the host to reconcile payments and hide full-share links while Paid remains checked.
- Do label illustrative data as an example.
- Don't add another sidebar around a tab that already has its own summary column.
- Don't imply that reminders send automatically or that a Venmo link confirms payment.

## Attendance exploration and kitchen sheet

The Menu heading includes a compact Kitchen sheet entry point. Attendance exploration belongs ahead of dish editing and must label the saved baseline separately from the local preview. Use ingredient quantity comparisons, clear selected states and tabular amounts; do not imply the preview has saved changes.

The Kitchen sheet is a single paper surface, with prep amounts and rounded shopping quantities in neighboring columns at wider widths. It stacks on phones. Print removes the event masthead, invitation, tabs and copy/print controls, retains the event details and food notes, and switches to white paper with dark text. Quantity rows and individual dishes avoid page breaks where possible. No payment or invitation details enter the copied sheet.

Printed checklist markers use a 2px corner radius; this is a small paper annotation, separate from control/card shapes. Print output uses white paper, black text and #aaa column dividers for economical reproduction.
