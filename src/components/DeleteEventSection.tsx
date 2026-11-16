"use client";

import { Card } from "./ui/Card";
import { SubmitButton } from "./ui/SubmitButton";

/** A server action already bound to the event id (see deleteEventAction). */
export type DeleteEventAction = (formData: FormData) => void | Promise<void>;

/**
 * "Danger zone": Delete event submits straight away (no confirm step), because
 * deleting is reversible from the dashboard for 30 days.
 */
export function DeleteEventSection({ title, action }: { title: string; action: DeleteEventAction }) {
  return (
    <Card className="mt-4 border-[1.5px] border-ketchup/25">
      <h2 className="text-lg font-bold text-ketchup">Danger zone</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Deletes <strong className="font-bold text-ink">{title}</strong> and its RSVPs, menu,
        shopping and split data. You can undo this from your events list for 30 days.
      </p>
      <form action={action} className="mt-3">
        <SubmitButton variant="danger" pendingLabel="Deleting...">
          Delete event
        </SubmitButton>
      </form>
    </Card>
  );
}
