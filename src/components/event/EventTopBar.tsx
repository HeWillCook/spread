"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { Cover } from "@/lib/cover";
import { CopyLinkButton } from "../CopyLinkButton";

/**
 * The phone header for an event: one compact sticky bar instead of the tall
 * ticket masthead. Share opens the invite link in place; the overflow menu holds
 * the actions that used to live under the title.
 */
export function EventTopBar({
  eventId,
  title,
  cover,
  planFor,
  confirmed,
  shareUrl,
  cancelled,
  accent,
  duplicateAction,
}: {
  eventId: string;
  title: string;
  cover: Cover;
  planFor: number;
  confirmed: number;
  shareUrl: string;
  cancelled: boolean;
  accent?: string;
  /** Bound server action: "Plan this again". */
  duplicateAction: () => Promise<void>;
}) {
  const [sheet, setSheet] = useState<"none" | "share" | "menu">("none");
  const base = `/host/events/${encodeURIComponent(eventId)}`;
  const close = () => setSheet("none");

  return (
    <div
      className="event-bar"
      style={accent ? ({ "--bar-accent": accent } as CSSProperties) : undefined}
    >
      <header className="event-top-bar">
        <Link href="/host" aria-label="All events" className="event-bar-back">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m14.5 5-7 7 7 7" />
          </svg>
        </Link>

        <div className="event-bar-copy">
          <span
            className={`event-bar-cover ${cover.className}`}
            data-cover={cover.color}
            aria-hidden="true"
          >
            {cover.emoji}
          </span>
          <div className="min-w-0">
            <p className="event-bar-title">{title}</p>
            <p className="event-bar-meta">
              ~{planFor} {planFor === 1 ? "guest" : "guests"}
              {confirmed > 0 ? ` · ${confirmed} confirmed` : ""}
            </p>
          </div>
        </div>

        {cancelled ? null : (
          <button
            type="button"
            className="event-bar-action event-bar-share"
            aria-expanded={sheet === "share"}
            aria-controls="event-share-sheet"
            onClick={() => setSheet(sheet === "share" ? "none" : "share")}
          >
            Share
          </button>
        )}
        <button
          type="button"
          className="event-bar-action event-bar-more"
          aria-label="More actions"
          aria-expanded={sheet === "menu"}
          aria-controls="event-more-menu"
          onClick={() => setSheet(sheet === "menu" ? "none" : "menu")}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </header>

      {sheet === "share" ? (
        <section
          id="event-share-sheet"
          className="event-bar-sheet"
          aria-label="Share this event"
        >
          <p className="text-sm font-bold">Invite your guests</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            Guests RSVP from this link. No account needed.
          </p>
          <div className="mt-3">
            <CopyLinkButton url={shareUrl} />
          </div>
        </section>
      ) : null}

      {sheet === "menu" ? (
        <nav id="event-more-menu" className="event-bar-sheet event-bar-menu" aria-label="Event actions">
          <Link href={`${base}/edit`} className="event-bar-menu-item" onClick={close}>
            Edit details
          </Link>
          <form action={duplicateAction}>
            <button type="submit" className="event-bar-menu-item">
              Plan this again
            </button>
          </form>
          <Link href={`${base}/prep`} className="event-bar-menu-item" onClick={close}>
            Kitchen sheet
          </Link>
          <Link href="/host" className="event-bar-menu-item" onClick={close}>
            All events
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
