import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";

export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(async (request) => {
  const auth = await getAuth();
  return auth.handler(request);
});
