# Kitchen sheet and attendance sandbox implementation plan

> For agentic workers: execute the independently owned tasks below; parent integrates and reviews them.

**Goal:** Let hosts explore uncertain attendance and carry their saved food plan into the kitchen.
**Architecture:** Pure calculations reuse buildShoppingList and saved MenuDish/Headcount data. Client controls only affect the preview. A separately authorized server route renders the saved kitchen sheet.
**Tech stack:** Existing Next 16.4.5, React, TypeScript, Tailwind and Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-11-kitchen-and-what-if-design.md

## Global constraints

Preserve all existing uncommitted work. No DB/schema changes, dependencies, commits, push or deploy. Auth stays independent at layout and page levels. No guest-private data on public routes. Cost previews clearly exclude actual spend/extras. All delegates use OpenCode DeepSeek 4.1 Flash high.

## Review focus

- Confirmed people include plus-ones; unanswered invitations remain unknown.
- Pack rounding, fractional ingredients, zero headcount and empty menus use existing math.
- Preview inputs never mutate server data or billing.
- Clipboard rejection and unavailable print APIs have usable fallbacks.
- Kitchen route checks ownership and print CSS hides only surrounding app chrome.

## Task 1 — Attendance sandbox (Flash delegate)

Own src/components/menu/WhatIfPlanner.tsx, its test, and src/lib/attendance-preview.ts + its test only. Expose WhatIfPlanner({ dishes: MenuDish[], headcount: Headcount, unansweredCount?: number }). Test preset/custom transitions, zero/empty/invalid input, pack rounding and cost-label honesty before implementation. Use scoped CSS class hooks; parent owns globals and integration. Run targeted tests and report contracts/limitations.

## Task 2 — Kitchen sheet (Flash delegate)

Own src/app/host/events/[id]/prep/page.tsx, src/components/prep/*, and src/lib/prep-sheet.ts + its test only. Server page loads and independently authorizes host event, menu and guests. Expose a saved-data print/copy sheet using scoped kitchen-* CSS hooks. Parent owns globals and entry points. Test quantities, notes filtering, copy fallback and action behavior. Read installed Next guides. Run targeted tests and report contracts/limitations.

## Task 3 — Integration and visual craft (parent)

Add Menu entry points and embed the sandbox. Style both features in globals.css to extend the established design. Inspect real desktop/mobile output and print media. Add relevant end-to-end privacy/read-only assertions. Update product/design docs and orchestration log.

## Task 4 — Review and verification

Review delegate diffs and targeted evidence. Run full unit tests, lint, TypeScript and production E2E checks. Request a fresh Flash review of integrated behavior. Resolve supported material findings directly, then show updated app evidence. Keep everything local/uncommitted.

## Progress and evidence

Kitchen implementation is integrated. Its 13 tests pass; together with event navigation checks, the parent ran 21 passing targeted tests. Scoped lint passes. Initial live checks found no 390px overflow or browser errors; print media retained the sheet and hid invitation/actions. The parent removed a duplicate page heading, simplified boxed regions to one paper surface, and added production E2E assertions for ownership, anonymous access and print visibility. A stale dev module was observed and the dev server was restarted before final captures. Both implementations are integrated. Final combined checks pass: 411 unit tests across 45 files, lint, TypeScript, production build and five E2E tests. The live demo retains its saved counts after exploration, and layouts fit at 1440, 390 and 320px. Fresh independent Flash review returned Ship with no material defects. Supported small wording, accessible-name and neutral-cost presentation findings are resolved; the three added regression tests were verified failing before the fixes and passing afterward. See 2026-11-11-creative-pass-results.md for details and capture limitations.
