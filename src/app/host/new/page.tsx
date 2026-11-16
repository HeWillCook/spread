import { NewEventForm } from "@/components/NewEventForm";
import { FirePage } from "@/components/FirePage";
import { requireHost } from "@/server/auth";
import { createEventAction } from "./actions";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireHost();
  return (
    <FirePage
      headline="Light a new one."
      detail="Name the night, set the time, and Spread turns the replies into portions, a shopping list and a split."
    >
      <NewEventForm action={createEventAction} />
    </FirePage>
  );
}
