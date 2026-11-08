import { ComingSoon } from "@/components/ComingSoon";
import { loadHostEvent } from "@/server/host-event";

export const dynamic = "force-dynamic";

// Placeholder: the Menu tab is filled in by a later task.
export default async function MenuTab({ params }: PageProps<"/host/events/[id]/menu">) {
  await loadHostEvent((await params).id);
  return <ComingSoon what="Menu" />;
}
