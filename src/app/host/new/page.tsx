import { NewEventForm } from "@/components/NewEventForm";
import { requireHost } from "@/server/auth";
import { createEventAction } from "./actions";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireHost();
  return <NewEventForm action={createEventAction} />;
}
