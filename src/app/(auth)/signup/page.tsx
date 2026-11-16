import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { ScrapbookPage } from "@/components/ScrapbookPage";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getHostOrNull()) redirect("/host");
  return (
    <ScrapbookPage
      headline="Every get-together starts here."
      detail="One link invites everyone. Guests reply without an account, and Spread counts the buns."
    >
      <AuthForm mode="signup" />
    </ScrapbookPage>
  );
}
