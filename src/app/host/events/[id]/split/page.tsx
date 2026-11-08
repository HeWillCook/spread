import { ComingSoon } from "@/components/ComingSoon";
import { loadHostEvent } from "@/server/host-event";

export const dynamic = "force-dynamic";

// Placeholder: the Split tab is filled in by a later task.
export default async function SplitTab({ params }: PageProps<"/host/events/[id]/split">) {
  await loadHostEvent((await params).id);
  return <ComingSoon what="Split" />;
}
