# From planning to the kitchen

The user requested a further creative pass and delegated design decisions. My choice is to extend the existing warm Cookout identity with two practical tools: an attendance sandbox and a portable kitchen sheet. Keep the existing Next/React stack and current local, uncommitted work.

## Experience

On Menu, “Room for a few more?” lets the host compare confirmed guests, the saved planning count, all yes/maybe guests, and a custom headcount. A live preview shows rounded shopping quantities and ingredient estimates compared with the saved plan. This is an exploration, never a saved RSVP, expense, portion, or payment change. Unanswered invitations remain unknown. Name the saved baseline and disclose that costs are ingredient estimates, excluding actual prices and extras.

A host-only Kitchen sheet opens from Menu. It shows the event details, saved headcount/range, all scaled dish prep quantities and rounded shopping quantities. Food notes for yes/maybe guests remain host-only and explicitly do not automatically alter recipes. Copy plain text with a selectable fallback, or print a clean sheet. Content comes from saved data; no invented cooking instructions or timelines. Printing must hide invitation links and app navigation without hiding the sheet. It is a tool for the host to deliberately hand off, never a public sharing route.

## Visual decisions

Preserve Georgia headings, cream/paper surfaces and red/mustard accents. The sandbox is a distinct notebook spread: large comparable headcounts, approachable controls, tidy ingredient comparisons. The kitchen sheet is sparse and readable at a counter, with checkable-looking print markers, clear dish sections and a practical shopping column. Mobile stacks in reading order; desktop makes both lists usable at once. Respect reduced motion and keyboard use.

## Limits

No database/schema changes, dependencies, authentication changes, automatic messaging, AI-generated cooking instructions, allergy substitutions, or payment mutations. No commits, pushes or deployment. All delegates use OpenCode DeepSeek 4.1 Flash, high variant.
