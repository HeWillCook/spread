import { describe, expect, it } from "vitest";
import {
  eventState,
  isPastEvent,
  PAST_GRACE_MS,
  splitEventsByTime,
  type EventLifecycle,
} from "./event-state";

const NOW = new Date("2026-11-15T12:00:00Z");
const future = new Date("2026-11-20T18:00:00Z");
const longPast = new Date("2026-11-01T18:00:00Z");

const live: EventLifecycle = { startsAt: future, cancelledAt: null, deletedAt: null };

describe("eventState", () => {
  it("reports the four states", () => {
    expect(eventState(live, NOW)).toBe("upcoming");
    expect(eventState({ ...live, startsAt: longPast }, NOW)).toBe("past");
    expect(eventState({ ...live, cancelledAt: new Date("2026-11-10T09:00:00Z") }, NOW)).toBe(
      "cancelled",
    );
    expect(eventState({ ...live, deletedAt: new Date("2026-11-10T09:00:00Z") }, NOW)).toBe(
      "deleted",
    );
  });

  it("gives deleted precedence over cancelled, and cancelled over past", () => {
    expect(
      eventState(
        {
          startsAt: longPast,
          cancelledAt: new Date("2026-11-02T09:00:00Z"),
          deletedAt: new Date("2026-11-03T09:00:00Z"),
        },
        NOW,
      ),
    ).toBe("deleted");
    expect(
      eventState({ ...live, startsAt: longPast, cancelledAt: new Date("2026-11-02T09:00:00Z") }, NOW),
    ).toBe("cancelled");
  });

  it("treats exactly twelve hours after the start as still upcoming", () => {
    const boundary = new Date(NOW.getTime() - PAST_GRACE_MS);
    expect(eventState({ ...live, startsAt: boundary }, NOW)).toBe("upcoming");
    expect(isPastEvent({ startsAt: boundary }, NOW)).toBe(false);
    expect(eventState({ ...live, startsAt: new Date(boundary.getTime() - 1) }, NOW)).toBe("past");
  });

  it("defaults to the current time", () => {
    expect(eventState({ ...live, startsAt: new Date(Date.now() + 86_400_000) })).toBe("upcoming");
    expect(eventState({ ...live, startsAt: new Date(Date.now() - 86_400_000) })).toBe("past");
  });
});

describe("splitEventsByTime", () => {
  const event = (title: string, startsAt: string, cancelledAt: Date | null = null) => ({
    title,
    startsAt: new Date(startsAt),
    cancelledAt,
  });

  it("puts upcoming soonest first and past most recent first", () => {
    const { upcoming, past } = splitEventsByTime(
      [
        event("Next month", "2026-12-15T18:00:00Z"),
        event("Last week", "2026-11-08T18:00:00Z"),
        event("Tomorrow", "2026-11-16T18:00:00Z"),
        event("Long ago", "2026-09-01T18:00:00Z"),
      ],
      NOW,
    );
    expect(upcoming.map((e) => e.title)).toEqual(["Tomorrow", "Next month"]);
    expect(past.map((e) => e.title)).toEqual(["Last week", "Long ago"]);
  });

  it("keeps a cancelled event in its date bucket", () => {
    const cancelledSoon = event("Called off", "2026-11-16T18:00:00Z", new Date("2026-11-15T09:00:00Z"));
    const { upcoming, past } = splitEventsByTime([cancelledSoon], NOW);
    expect(upcoming.map((e) => e.title)).toEqual(["Called off"]);
    expect(past).toEqual([]);
  });

  it("uses the twelve-hour grace window for the split", () => {
    const justStarted = event("Still going", "2026-11-15T06:00:00Z"); // 6h ago
    const finished = event("Done", "2026-11-14T20:00:00Z"); // 16h ago
    const { upcoming, past } = splitEventsByTime([justStarted, finished], NOW);
    expect(upcoming.map((e) => e.title)).toEqual(["Still going"]);
    expect(past.map((e) => e.title)).toEqual(["Done"]);
  });

  it("returns two empty lists for no events", () => {
    expect(splitEventsByTime([], NOW)).toEqual({ upcoming: [], past: [] });
  });
});
