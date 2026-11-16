"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

/** A server action already bound to the event id (see deleteEventAction). */
export type DeleteEventAction = (formData: FormData) => void | Promise<void>;

/** The two confirm buttons; inside the form so useFormStatus sees its pending state. */
function DeleteActions({
  confirmRef,
  describedBy,
  onCancel,
}: {
  confirmRef: RefObject<HTMLButtonElement | null>;
  describedBy: string;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        ref={confirmRef}
        variant="red"
        type="submit"
        disabled={pending}
        aria-describedby={describedBy}
      >
        {pending ? "Deleting..." : "Yes, delete it"}
      </Button>
      <Button variant="outline" type="button" disabled={pending} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

/** "Danger zone": Delete event reveals an inline confirmation, then submits the action. */
export function DeleteEventSection({ title, action }: { title: string; action: DeleteEventAction }) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const questionId = useId();

  // The confirm step replaces the button that was pressed, so put focus on its first action.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <Card className="mt-4 border-[1.5px] border-ketchup/25">
      <h2 className="text-lg font-bold text-ketchup">Danger zone</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Deleting an event can’t be undone.
      </p>

      {confirming ? (
        <form action={action} className="mt-3 flex flex-col gap-3">
          <p id={questionId} className="text-sm leading-relaxed">
            Delete <strong className="font-bold">{title}</strong>? This permanently removes all
            RSVPs, the menu, shopping and split data.
          </p>
          <DeleteActions
            confirmRef={confirmRef}
            describedBy={questionId}
            onCancel={() => setConfirming(false)}
          />
        </form>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)} className="mt-3">
          Delete event
        </Button>
      )}
    </Card>
  );
}
