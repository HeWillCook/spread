import { NewEventPage } from "@/components/NewEventPage";
import { requireHost } from "@/server/auth";
import { createEventAction } from "./actions";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function NewEventPageRoute() {
  await requireHost();
  return <NewEventPage action={createEventAction} />;
}
