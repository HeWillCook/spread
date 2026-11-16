"use client";

import { Card } from "./ui/Card";
import { SubmitButton } from "./ui/SubmitButton";

/** A server action already bound to the event id (see cancelEventAction). */
export type CancelEventAction = (formData: FormData) => void | Promise<void>;

/**
 * Cancel or reinstate an event without deleting it. Cancelling keeps the guest
 * link working (with RSVPs closed) and everything on the event in place.
 */
export function CancelEventSection({
  cancelled,
  action,
}: {
  cancelled: boolean;
  action: CancelEventAction;
}) {
  return (
    <Card className="mt-4">
      <h2 className="text-lg font-bold">{cancelled ? "Event cancelled" : "Cancel event"}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        {cancelled
          ? "Guests see the cancellation notice and can't RSVP. Everything is still here, so you can reinstate it if plans change."
          : "Call it off without deleting anything. Guests keep the link, see that it's cancelled, and can't RSVP."}
      </p>
      <form action={action} className="mt-3">
        {cancelled ? (
          <SubmitButton variant="red" pendingLabel="Reinstating...">
            Reinstate event
          </SubmitButton>
        ) : (
          <SubmitButton variant="outline" pendingLabel="Cancelling...">
            Cancel event
          </SubmitButton>
        )}
      </form>
    </Card>
  );
}
