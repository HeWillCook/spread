# Cookout audit results

## Direction and delivered behavior

The original product problem was uncertain attendance and food quantities. This pass keeps Cookout's cream/red identity and existing stack, while making the host's working plan more useful.

- The landing page explains the workflow with a labeled example. Host screens use desktop space while retaining a stacked phone layout. Shared controls have clearer contrast, focus states and larger touch targets.
- Every event exposes its invitation. Non-responders have personal reminder drafts with a manual-copy fallback. The host sends the message in their usual chat; there is no email/SMS delivery integration.
- Confirmed attendance and planning estimates are labeled separately. Unanswered invitations remain unknown and are not automatically counted.
- Going/maybe guests' food notes appear on Guests, Menu and Shopping. They do not automatically change ingredients or portions.
- Menu shows scaled prep quantities from saved portions. Shopping continues to round up to whole buy units.
- A purchased item needs review if its required buy quantity grows. Its recorded expense remains intact. Shopping and Split disclose provisional totals until rechecked.
- Venmo sharing records the amount actually transmitted, so later changes prompt follow-up. Paid flags remain host-entered history. A guest whose share becomes zero still gets an old-link warning.
- RSVP submission copy follows the selected answer.

## Agent orchestration

The first design and functionality audits were read-only and independent. Initial DeepSeek V4 Pro calls failed under the OpenCode regional policy; retries completed after the user chose to change that setting. When the user subsequently required 4.1 Flash, the unfinished Pro implementation was stopped before it wrote code. All subsequent implementation/review delegates use `opencode-go/deepseek-v4.1-flash`, high variant. The preference is recorded in AGENTS.md.

| Role | Ownership and result |
| --- | --- |
| [Design audit](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3Ad1b36aed-2cba-4f10-ac15-1c7844a08727) | Found the missing event-local invitation, narrow desktop layouts and contrast/focus issues. |
| [Functionality audit](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3Adb8e0c31-8fcf-49dd-ba7b-b9697851a52a) | Traced late RSVP changes, stale shopping ticks and changed payment-link amounts. |
| [Flash visual implementation](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3Adfa8e298-937f-4f6e-80eb-c0a20f2a7894) | Owned global tokens, UI primitives, landing, dashboard, event shell and app icon. |
| [Flash correctness implementation](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3A71794270-bae3-4bf0-a76d-c84f7dbb7add) | Owned shopping/payment state, migration, services, related UI and regression tests. |
| Parent integration | Owned reminders, food-note summaries, prep quantities, RSVP changes and full-flow verification. Removed the nested third sidebar after inspecting rendered output. Added provisional totals to Split and the zero-share old-link warning. |
| [Independent Flash review](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3A06a84d7e-bf93-4797-bab7-3a09f9827c9c) | Reviewed the integrated diff and screenshots and ran 165 targeted tests. Found four supported copy/layout/payment issues, resolved by the parent; no additional review cycle requested. |

Implementation delegates shared the checkout with explicit, disjoint file ownership. They did not create commits or pull requests. The parent reviewed integration and ran the full checks.

## Independent review disposition

The Flash reviewer found no auth, privacy, data-loss or total-integrity defect. Its disposition was “fix, then ship,” with no new review cycle needed after the small corrections. The parent verified the findings and resolved all four:

- Shopping now says “confirmed,” because the count includes plus-ones rather than just RSVP answers. Added plus-one coverage and updated the affected expectations.
- A paid guest whose share changes gets reconciliation guidance. Full-share Venmo links are hidden while Paid remains checked; the guidance explains that Paid should only be cleared if the full current share is still due. Paid history stays intact. Regression coverage checks the absence of both Send and Open links for paid guests and the availability of an updated link for unpaid guests.
- Edit details is capped at `max-w-xl`. A fresh browser check measured its input/form width at 534px on a 1440px viewport and 316px on a 390px viewport. Both fit without horizontal overflow and produced no page errors; screenshots were inspected at both sizes.
- The illustrative landing block is titled “The plan,” matching its mix of prepared burgers and ingredients.

The reviewer inspected screenshot evidence and source, but did not interact with the live app or test a populated production Postgres migration. Parent browser checks supplement that review; native share-sheet and real-device Venmo behavior still need a real-device check before a party.

## Validation and limits

Baseline: 338 tests and clean lint. The production build and five end-to-end tests pass, including account creation, privacy, RSVP changes, invitation/reminder access, increased purchase quantities, attendance, guest removal, walk-ins, sign-out and desktop width. A timing-sensitive split test was corrected to assert membership rather than assume insertion order for equal timestamps.

Playwright screenshots cover populated Guests, Menu, Shopping and Split, landing, and the guest RSVP form at 1440px and 390px. All captured routes fit without horizontal overflow and report no browser page errors. T3's preview snapshot timed out twice on one screen; the parent switched to Playwright for screenshots. The mechanical design scan found 26 documentation advisories about the type/radius scale, with no higher-severity findings; the actual values are recorded in DESIGN.md.

Migration 0004 adds nullable `checked_qty` and `link_sent_amount_cents`. Local PGlite applies it at startup; deployed Postgres needs the normal `npm run db:migrate` step. Old purchase ticks and shared links without a stored basis are treated conservatively as needing review.

Reminder delivery, automatic allergy substitutions, cross-device guest identity and per-plus-one cost exclusion remain outside this pass. Name matching remains conservative; the UI explains that different spellings can leave someone listed as unanswered.

Final checks after resolving the independent review: **366 tests pass across 40 files; lint, TypeScript and whitespace checks pass.** The production build and all five end-to-end tests pass on the final implementation. Independent review is resolved as described above. Changes remain local and uncommitted; no push or deployment was performed.
