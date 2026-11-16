"use client";

import { useState } from "react";
import { occasionFor, type OccasionTheme } from "@/lib/occasion";
import { ScrapbookPage } from "./ScrapbookPage";
import { NewEventForm, type NewEventAction } from "./NewEventForm";

/** The new-event page keeps the cover picker state in one place so the panel previews it live. */
export function NewEventPage({ action }: { action: NewEventAction }) {
  const [theme, setTheme] = useState<OccasionTheme>(occasionFor("🎉"));
  return (
    <ScrapbookPage
      headline="What are we celebrating?"
      detail="Name the night, set the time, and Spread turns the replies into portions, a shopping list and a split."
      previewTheme={theme}
      className="new-event-page"
    >
      <NewEventForm action={action} onCoverChange={(emoji) => setTheme(occasionFor(emoji))} />
    </ScrapbookPage>
  );
}
