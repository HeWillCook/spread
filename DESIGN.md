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

Shells are at most 64rem wide. Event screens open with the ticket, then sticky text tabs over a 2px charcoal rule, with a 5px ketchup bar under the current tab. At 1024px and up, task content uses a list beside a 320px summary column. Guest, sign-in and new-event screens are single slips about 28rem wide.

## Motion

There is one orchestrated moment: on the landing page the example ticket prints down out of a dark slot. Reduced-motion users get it already printed. Elsewhere, motion only answers actions.

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
