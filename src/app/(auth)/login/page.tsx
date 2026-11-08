import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getHostOrNull } from "@/server/auth";

// Reads the session from request headers, so it must never be prerendered.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getHostOrNull()) redirect("/host");
  return <AuthForm mode="login" />;
}
