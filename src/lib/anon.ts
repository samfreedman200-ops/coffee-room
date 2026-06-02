import "server-only";
import { cookies } from "next/headers";

const ANON_COOKIE = "cr_anon";

/**
 * Read-only lookup of the anonymous-reactions cookie. Pages call this so
 * they can pass the id into `reactionsForTargets()` and the `Reactions`
 * component highlights anon-user "mine" reactions without forcing a write.
 *
 * Returns null if the cookie has never been set (visitor who has never
 * reacted). The write path lives in `app/reactions/actions.ts`.
 */
export async function readAnonId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE)?.value ?? null;
}
