# Event lifecycle and polish: 10 features

Date: 2026-11-15. Status: approved by the host (user said "I like all of em"); decisions below are Opus's defaults.

## Shared ground rules

- **Schema is fixed.** Migration `0005` (written by the orchestrator, already committed) adds five nullable columns to `events`:
  `deleted_at`, `cancelled_at`, `details_changed_at` (timestamptz), `cover_emoji`, `cover_color` (text).
  Children MUST NOT edit `src/db/schema.ts` or anything in `drizzle/`.
- **Event state precedence** (derive with one helper, `eventState(event, now)` in `src/lib/event-state.ts`):
  `deleted` (deletedAt set) > `cancelled` (cancelledAt set) > `past` (startsAt < now − 12h) > `upcoming`.
  Past is derived from `startsAt`; there is no archived column.
- Server actions take bound ids that are NOT trusted: every service re-checks host ownership (pattern: `and(eq(events.id, id), eq(events.hostId, hostId))`).
- Children run targeted tests + `npx tsc --noEmit` + `npm run lint`; CI runs the full suite (the machine is heavily loaded; PGlite hooks time out under load, use `--testTimeout=30000 --hookTimeout=60000`).

## Wave 1: lifecycle (one child, sequential)

### 1. Undo instead of confirm (soft delete)
- `deleteEvent` sets `deletedAt = now()` instead of deleting. New `restoreEvent(db, hostId, eventId)` clears it (NotFoundError if not the host's or not deleted).
- **Every read and write path must exclude deleted events.** Grep every query touching `events` (services/*, server/host-event.ts, e/[code] pages + actions, g/[token] page, listHostEvents, headcountForEvents, menu/shopping/split/guestAdmin services, dev actions) and list them in the report. Host pages for a deleted event → notFound(). Add a test per service path that a deleted event is invisible / its writes rejected.
- Purge: lazy and host-scoped. On dashboard load, hard-delete that host's events with `deletedAt < now − 30 days` (`purgeDeletedEvents(db, hostId)`), cascade handles children.
- UI: the danger-zone confirm step goes away. "Delete event" submits immediately (still a POST form, pending state). Redirect to `/host?deleted=<eventId>`. Dashboard looks up that id (host-scoped, deleted only) and shows `Deleted "<title>". [Undo]` where Undo is a form posting `restoreEventAction(eventId)` → redirect to the event page. Plus a Dismiss link. If the id doesn't resolve, show nothing.
- Copy on the danger zone: "You can undo this from your events list for 30 days."

### 2. Past events auto-archive
- Dashboard splits into Upcoming (soonest first) and Past (most recent first). Past is a `<details>` collapsed by default, summary "Past events (N)". Cancelled events sort into their date bucket but show a "Cancelled" badge.

### 4. Guest page for a deleted or cancelled event
- `/e/[code]` and `/e/[code]/g/[token]`: deleted → a friendly "This event is no longer available" page (not the 404), with the host's name. Cancelled → page renders with a prominent "Cancelled by <host>" banner, RSVP form hidden; existing reply shown read-only.
- RSVP server actions reject deleted and cancelled events server-side (ValidationError with a friendly message). Tested.

### 5. Cancel without deleting
- `cancelEvent` / `uncancelEvent` services (host-scoped) set/clear `cancelledAt`. Actions on the edit page, above the danger zone: "Cancel event" (POST) / "Reinstate event".
- When cancelled, the host event layout shows a "Cancelled" banner, and a `CopyReminderButton`-style "Copy cancellation message" button with text: `Sorry everyone, <title> on <when> is cancelled. <optional reason-free closing>`. Reuse existing copy-button component and format helpers.

## Wave 2: new surfaces (parallel with wave 1, new files only)

### 3. Duplicate an event ("Plan this again")
- `duplicateEvent(db, hostId, eventId)` in a transaction: new id, new share code (reuse the generator createEvent uses), same title + " (again)", location, timezone, maybePercent, venmoUsername, hostCoverCents, menu dishes (servingsPerPerson), invitees (names of the old guest list AND old invitees, deduped case-insensitively). `startsAt` = same weekday/time one week after the later of (original startsAt, now). Do NOT copy guests, plus-ones, shopping state, extra costs, cover columns, cancelled/deleted/detailsChanged.
- Button "Plan this again" on the event page header (host layout) → redirect to the new event's edit page.

### 8. Add to calendar
- Route handler `src/app/e/[code]/calendar.ics/route.ts`: `text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="<slug>.ics"`. VEVENT with UID `<eventId>@spread`, DTSTAMP, DTSTART in UTC (`YYYYMMDDTHHMMSSZ`), DTEND = start + 3h, SUMMARY, LOCATION, URL (share URL), DESCRIPTION "Hosted by <host> · RSVP: <url>". CRLF line endings, RFC 5545 text escaping (`\\`, `;`, `,`, newlines), fold lines > 75 octets. Pure builder in `src/lib/ics.ts` with unit tests. Deleted event → 404; cancelled → include `STATUS:CANCELLED`.
- On the guest page: "Add to calendar" link to the .ics plus a Google Calendar link (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=..&dates=START/END&location=..&details=..`). Builder in the same lib, tested.

### 10. Day-of view ("Today" tab)
- There is no per-recipe timing data, so do not invent cook times. New host tab `/host/events/[id]/today` (add to EventTabs): a checklist built from existing data — unticked shopping items (from the shopping service), prep sheet dishes/quantities (buildPrepSheet), and fixed milestones relative to startsAt: "Shopping done" (morning), "Start prep" (startsAt − 3h), "Set up" (startsAt − 1h), "Guests arrive" (startsAt), shown in the event timezone. Check state stored in localStorage keyed by event id (no schema). Shows headcount at top. Pure builder in `src/lib/today-plan.ts` with tests.

## Wave 3: after wave 1 merges

### 6. Change alerts
- `updateEvent` sets `detailsChangedAt = now()` only when startsAt, timezone or location actually changes (compare before/after); title-only edits don't count. Test both.
- Guest pages: if `detailsChangedAt` is set and later than the guest's `createdAt` (or for anonymous visitors, within the last 14 days), show "Updated <relative date>: now <when> at <location>".
- After saving a change to time/location, the host lands on the event page with a copyable "Heads up: <title> is now <when> at <location>" message (via `?changed=1`).

### 7. Dashboard at a glance
- Each upcoming card shows countdown ("today", "tomorrow", "in 6 days"), yes/maybe/no counts, and "N haven't replied" (invitees with no matching guest, same rule as `noReplyNames`). Batch all counts in one or two queries for all events (pattern: `headcountForEvents`); no per-event queries. Tested.

### 9. Event cover
- Edit and new-event forms get a cover picker: 8 preset emoji (🎉 🍔 🎂 🍕 🌮 🥂 🎃 🎄) and 6 preset colors mapped to existing palette tokens in globals.css. Validate against the preset lists server-side (zod). Shown on dashboard cards, event layout header and guest page header. Defaults: 🎉 + mustard when null.
