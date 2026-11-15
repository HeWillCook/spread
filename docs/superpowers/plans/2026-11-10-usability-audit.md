# Cookout usability improvements

The user requested OpenCode subagents, independent design and functionality audits, and autonomous implementation. Keep existing data and auth contracts. Changes stay local for review.

## Ownership

- OpenCode design auditor: read-only review of app screens, hierarchy, accessibility and responsiveness.
- OpenCode functionality auditor: read-only trace of RSVP, headcount, menu, shopping and split edge cases.
- OpenCode visual implementer: globals, shared UI primitives, home, dashboard, event layout and icon. Broaden desktop layout, simplify chrome, improve focus/contrast, show the invitation inside the event.
- Parent: guest workflow, personal reminder drafts, RSVP wording, integration, tests and browser verification.
- Functional implementation scope: selected after audit; separate ownership from visual shell and guest workflow.

## Deliverables

1. Useful landing and host layouts at phone and desktop widths, with accessible controls and honest estimated headcounts.
2. Personal copyable reminders for unanswered invitations, manual-copy fallback and no automatic delivery. Keep food notes findable and explain how unknown attendance affects planning.
3. Bounded functional reliability improvement based on the audit, with regression tests.
4. Full unit suite, lint, production build and mobile end-to-end verification. Inspect rendered desktop and phone screens. Independent final OpenCode review, then address material findings.

## Validation

Baseline: 39 test files, 338 passing tests; lint clean. Test new behavior before implementing it. Preserve existing auth and privacy tests. Update assertions when deliberate copy changes distinguish estimated attendance from confirmed attendance. Record agent findings and final decisions in the audit report.
