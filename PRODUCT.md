# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hosts planning casual parties and guests responding from a shared invitation link. The original user wants fewer unknowns about attendance, food quantities, and toppings.

## Product Purpose

Turn guest responses into a practical food plan, shopping quantities and a cost split. Help a host see who has not responded and follow up.

## Operating Context

Guests use phones without creating an account. Hosts plan ahead, shop, record attendance and manually confirm payments. The existing app is called Spread.

## Capabilities and Constraints

Next.js App Router, React, TypeScript, Tailwind, Drizzle and Better Auth. Embedded PGlite for local development; Postgres for deployment. RSVP statuses are going, maybe and declined. Plus-ones count toward food quantities. Hosts choose a percentage of maybes to plan for. Non-responders are unknown, not automatically counted. Portion and price defaults are estimates that hosts can edit. Venmo links do not confirm payment. There is no email or SMS delivery service configured.

## Product Principles

- Distinguish confirmed attendance from planning estimates.
- Put the invitation beside the guest list.
- Preserve guest privacy and account-free responses.
- Show actionable quantities and honest cost estimates.

## Decisions for This Audit

The user delegated visual and functional decisions. This pass retains the warm Spread identity and existing stack, improves responsive layouts, and prioritizes host follow-up and shopping reliability. These are implementation choices for this pass.

## Taking the plan into the kitchen

Hosts can explore attendance scenarios without changing saved RSVPs, portions or payments. Preview costs use ingredient estimates and exclude recorded spend and extras. The Kitchen sheet uses saved quantities, offers deliberate copy/print actions, and remains behind host authorization. Food notes follow the same host-only yes/maybe filtering as the planning screens. These are implementation choices for the creative second pass.
