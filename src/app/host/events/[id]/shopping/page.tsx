import { ComingSoon } from "@/components/ComingSoon";
import { loadHostEvent } from "@/server/host-event";

export const dynamic = "force-dynamic";

// Placeholder: the Shopping tab is filled in by a later task.
export default async function ShoppingTab({ params }: PageProps<"/host/events/[id]/shopping">) {
  await loadHostEvent((await params).id);
  return <ComingSoon what="Shopping" />;
}
