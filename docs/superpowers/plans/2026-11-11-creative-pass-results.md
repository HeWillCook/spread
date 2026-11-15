# Cookout creative pass

The user requested another autonomous creative pass. I chose two tools for the original attendance-and-food problem: explore an uncertain crowd, then take the saved plan into the kitchen. The existing cream/red identity and stack remain the foundation.

## Delivered experience

Menu includes an expandable “Try a different crowd” section. It keeps ordinary dish editing accessible while offering a local attendance sandbox with confirmed/current/all-maybe presets and a custom whole-person count. The preview compares dish yields, rounded buy quantities, and ingredient estimates against the saved plan. Plus-ones are included; unanswered invitations stay unknown. Costs explicitly exclude recorded spending and extras. Previewing never writes RSVPs, menu portions, shopping state or payment data.

A Kitchen sheet entry point opens a host-authorized route containing saved event details, planning counts, scaled dish prep amounts, rounded shopping quantities, and yes/maybe food notes. Hosts can copy it, use selectable text if clipboard access fails, or print it. Print styling removes event navigation/invitation/actions while retaining the actual sheet. It contains no generated cooking instructions, payment details or invitation code. Food notes do not automatically change recipes.

## Orchestration and decisions

- [OpenCode Flash · Attendance what-if sandbox](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3Ae119aadf-5ae8-4ce6-83bb-5fcf3f08a141) owned the pure preview math, interactive component, and 27 targeted tests.
- [OpenCode Flash · Portable kitchen sheet](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3A49925841-5e03-4605-a229-1cdd30249354) owned the authorized server route, sheet/text builder, copy/print controls, and 13 targeted tests.
- Parent owned integration, navigation, responsive/print CSS, E2E coverage, screenshots and docs. I made the sandbox expandable, removed redundant headings and repeated copy, brought estimate limits beside the costs, and shaped the sheet as one paper surface rather than nested cards.

Both implementations ran in parallel with disjoint file ownership, using OpenCode DeepSeek 4.1 Flash with high variant. They made no commits. No dependencies, database/schema changes or external services were added. [Independent Flash review](t3-thread://v2/2c52eef7-b58b-4b43-8864-6411ba26ac77/thread:delegated-task:command%3Amcp%3Abf009444-0613-4734-a4d6-776092f15470%3Adelegate-task%3A8b722f1c-3433-4bf0-ad39-4191faf11e73) returned **Ship**, with no material correctness or visual defects. The reviewer independently inspected seven screenshots and ran 62 targeted tests. I resolved the supported small findings: distinguish zero planned people from zero dish portions in screen/copy empty states, use an accurate zero-person planning label, give the Kitchen link a clear accessible name, and keep unchanged cost deltas neutral. Three additional regression tests cover the empty-state corrections; their expected failures were observed before the fixes.

## Verification

Baseline for this pass: 366 tests. The integrated implementation passes **411 tests across 45 files, lint, TypeScript, production build and all five E2E tests**. New E2E assertions cover anonymous/other-host denial for the sheet, previewing 8 people while the saved plan remains at 2, a saved sheet that still makes 3 burgers, Menu navigation, and print hiding the app chrome while preserving the sheet.

Browser checks on the populated local demo confirm 1440px, 390px and 320px layouts without horizontal overflow or page/console errors. The demo still plans for 4 people and 6 burgers after exploring 8. Print media hides the invitation/actions and retains the sheet. A stale module from the development server was detected during integration, and the server was restarted before final captures.

Evidence: /private/tmp/cookout-creative/report.json, inspect.cjs, whatif-desktop.png, whatif-mobile.png, kitchen-desktop.png, kitchen-mobile.png and kitchen-print.png. These are local inspection artifacts. The what-if component captures temporarily hide sticky navigation and the Next dev indicator. The Kitchen desktop/mobile element captures retain those overlays and clip the top of the sheet; this is a capture artifact. The print capture and visibility checks confirm that the sheet remains visible and surrounding app chrome is hidden for print. The app retains its normal navigation on screen.

The single mechanical scan reported no primary findings and two documentation advisories: the print check-marker radius and print divider gray. Those intentional print values are now documented in DESIGN.md.

## Limits

The sandbox is deliberately exploratory and does not apply a new headcount. To change the saved plan, hosts use the existing guest/portion controls. Custom headcounts allow 25 people above the largest saved count. Actual spending and extras are excluded from its estimate. Shopping rows match saved dish items and are not consolidated across recipes.

Printed/copied food notes contain the names and notes visible to the host, so handing off the sheet is a deliberate host action. Clipboard and print controls have unit/browser-style coverage; real operating-system share sheets, printer drivers, native Venmo and a populated production Postgres migration were not exercised. No migration was added in this pass.

All changes remain local/uncommitted. No push or deployment was performed.
