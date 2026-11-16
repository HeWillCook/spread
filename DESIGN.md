---
name: Spread
description: Scrapbook stickers, washi tape and occasion themes on pink butcher paper, for casual hosts.
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
  coal: "#1a110c"            # the cookout scene only
  ember: "#ff6b1a"           # the cookout scene only
  flame: "#ffb43a"           # the cookout scene only
  flame-tip: "#ffe08a"       # the cookout scene only
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
  sticker: "thick white die-cut edge"
---

## Overview

Spread is a scrapbook on the kitchen counter: pink butcher paper underneath, the plan printed on order tickets, and the page dressed for the occasion. Two layers do the work.

1. **The shared scrapbook.** Hand-drawn stickers at slight angles, torn washi tape, a paper bunting garland and gingham picnic checks. They frame the paper and fill the quiet space. They are chrome, never content.
2. **The occasion.** Each event's cover emoji picks a theme: its scene plays in the event masthead and guest page, its sticker sits on the dashboard ticket, and its colour tints the active tab. Fire is one theme among eleven, not the house style.

The **ticket** is still the one bold object: the event header, the guest RSVP slip, the sign-in and new-event slips, the dashboard event tickets, the landing example, and the running-total receipt. Text always sits on paper labels, never directly on gingham.

## Colors

Butcher paper (`--cream`) is the page and carries a faint fibre texture (`--grain`). Ticket paper (`--paper`) holds working content. Ketchup marks primary actions and large numbers; mustard marks "maybe" and food accents; pickle marks "going". Gingham is ketchup, soft mustard or sage checks on cream, at about a tenth tint so type on the paper beside it stays quiet. Stickers use two or three flat palette colours each, with a thick paper-white die-cut edge and a soft printed shadow.

Coal, ember and flame are reserved for the cookout scene. They never appear as page chrome, and never in any other occasion. Text on coal, if a cookout scene ever needs it, is always `--paper`.

## Typography

Alfa Slab One sets every heading and the wordmark. It has one heavy weight, so `font-synthesis: none` is applied and headings use weight 400. Archivo sets body copy, labels and controls. Large counts (plan for, totals) use Archivo at `font-stretch: 62%`, weight 800, tabular numerals, in ketchup. Labels are sentence case: no all-caps eyebrows.

## Layout

Shells are at most 64rem wide. Event screens open with the ticket, now headed by a thin occasion strip, then sticky text tabs over a 2px charcoal rule. The active tab bar is a solid ketchup bar, or the event's theme accent. At 1024px and up, task content uses a list beside a 320px summary column that sticks below the tabs.

Sign-in, sign-up, new-event and guest RSVP screens are two panes: a tall sticky scrapbook panel on the left and the slip on the right. Base pages use a gingham blanket with bunting, stickers and the headline on a paper label. Guest pages use the event's occasion scene behind the title label. Below 1024px the panel becomes a short strip above the slip.

The dashboard grid is one column, then two from 640px; it never crowds three cards into the 64rem shell. Today stacks Timeline and Make beside Still to buy. Edit details keeps the form on the left and the cancellation and delete controls on the right, sticky.

Empty states are paper cards with a slab title, one line of body copy and a small sticker composition in a cream mat, with a washi tape at the top and a gingham hem. They keep the copy and fill the column they sit in.

## Scrapbook and occasions

The base layer is always there: bunting at the top of a hero or panel, washi tape holding a ticket, gingham as a blanket, and a handful of stickers. The occasion layer is derived from the cover emoji with `occasionFor`, so the data model only needs the preset cover.

| Cover | Theme | Scene | Sticker |
| --- | --- | --- | --- |
| 🎉 | party | confetti drifting slowly | balloon |
| 🍔 | cookout | small flame bed and embers | burger |
| 🎂 | birthday | three candles and sprinkles | cake |
| 🍕 | pizzeria | red gingham and curling steam | pizza |
| 🌮 | fiesta | papel picado swaying | taco |
| 🥂 | toast | bubbles and twinkling lights | glasses |
| 🎃 | harvest | autumn leaves tumbling | pumpkin |
| 🎄 | holiday | snowfall and twinkle lights | tree |
| 🧺 | picnic | gingham, marching ants, a butterfly | basket |
| ☕ | brunch | steam from a mug | mug |
| 🎲 | game night | two dice tumbling and settling | dice |

An unknown or missing cover is a picnic.

- Fire belongs only to the cookout theme. It is a contained scene strip or panel, never the page background.
- Scenes are contained, `overflow: hidden`, and use 8–16 particles in a strip, sized to the panel at larger sizes. They are `aria-hidden`, CSS-only and deterministic.
- Bunting and scenes may loop gently; everything else answers an action. A success moment gets one `OccasionBurst` and stops.
- Keep the sticker count to about six in any one viewport. Stickers are the identity: clear silhouettes, two or three flat colours, a paper-white die-cut border and a slight tilt, not clip-art blobs. If a drawing does not read at 64px, simplify it.

## Motion

Ambient motion lives only inside occasion scenes and bunting: confetti drift, snowfall, bubbles, steam, leaves, a marching line of ants, candles flickering, dice settling. Stickers may peel on once, and the wordmark's mustard period may wobble once on hover. Primary buttons press and tilt; they do not glow or sweep.

The one orchestrated page moment is still the landing example printing down out of its paper slot, under two strips of washi tape. Success notices burst once in the occasion's voice, or confetti when there is no theme.

`prefers-reduced-motion: reduce` stills every loop and hides the occupied particles and bursts; scenes must look finished as static pictures. Print strips all stickers, tape, bunting, scenes and bursts.

## Shapes

Controls are 6px; surfaces are 8px; tags are fully round. Tickets have a CSS zigzag foot and perforations. Washi tape has torn ends and sits at a slight angle. Stickers have a die-cut white edge; bunting flags are triangles or cut-paper picado rectangles.

## Components

Buttons and fields are at least 44px tall. Primary buttons are ketchup with a 3px inset base shadow, like a pressed key, and a small hover tilt; outline buttons use a 1.5px charcoal border. Focus is a 2px charcoal outline with 3px offset.

## Do's and Don'ts

- Do distinguish a planning estimate from confirmed attendance.
- Do keep food notes visible during menu and shopping tasks, with an explanation that they do not automatically alter the recipe.
- Do preserve recorded expenses and paid flags when quantities change; flag the review needed. For paid guests, ask the host to reconcile payments and hide full-share links while Paid remains checked.
- Do label illustrative data as an example.
- Do put headlines on paper labels; gingham is a blanket, never a text background.
- Don't add site-wide fire, a coal band, or grill texture outside the cookout theme.
- Don't add another sidebar around a tab that already has its own summary column.
- Don't imply that reminders send automatically or that a Venmo link confirms payment.

## Attendance exploration and kitchen sheet

The Menu heading includes a compact Kitchen sheet entry point. Attendance exploration belongs ahead of dish editing and must label the saved baseline separately from the local preview. Use ingredient quantity comparisons, clear selected states and tabular amounts; do not imply the preview has saved changes.

The Kitchen sheet is a single paper surface, with prep amounts and rounded shopping quantities in neighboring columns at wider widths. It stacks on phones. Print removes the event masthead, invitation, tabs and copy/print controls, retains the event details and food notes, and switches to white paper with dark text. Quantity rows and individual dishes avoid page breaks where possible. No payment or invitation details enter the copied sheet.

Printed checklist markers use a 2px corner radius; this is a small paper annotation, separate from control/card shapes. Print output uses white paper, black text and #aaa column dividers for economical reproduction.
