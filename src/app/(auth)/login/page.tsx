import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { FirePage } from "@/components/FirePage";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getHostOrNull()) redirect("/host");
  return (
    <FirePage
      headline="Welcome back to the grill."
      detail="Your guest list, the food plan and the split are right where you left them."
    >
      <AuthForm mode="login" />
    </FirePage>
  );
}
