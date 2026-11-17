import { cookies } from "next/headers";
import { actorFromToken } from "@/server/domain";

export const SESSION_COOKIE = "dadshed_session";

export async function getActor() {
  const jar = await cookies();
  return actorFromToken(jar.get(SESSION_COOKIE)?.value ?? "");
}
