import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { ScrapbookPage } from "@/components/ScrapbookPage";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getHostOrNull()) redirect("/host");
  return (
    <ScrapbookPage
      headline="Good to see you again."
      detail="Your guest list, the food plan and the split are right where you left them."
    >
      <AuthForm mode="login" />
    </ScrapbookPage>
  );
}
