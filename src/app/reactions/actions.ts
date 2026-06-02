"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { currentUser } from "@/lib/auth";
import {
  isValidEmoji,
  toggleAnonReaction,
  toggleReaction,
  type ReactionTargetKind,
} from "@/lib/reactions";
import { getComment, getPost } from "@/lib/posts";
import { COOKIE_SECURE } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const ANON_COOKIE = "cr_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

async function getOrSetAnonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANON_COOKIE)?.value;
  if (existing) return existing;
  const fresh = nanoid(16);
  jar.set(ANON_COOKIE, fresh, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return fresh;
}

export async function toggleReactionAction(
  formData: FormData,
): Promise<void> {
  // Rate-limit reaction toggles modestly so the button isn't a free DoS knob.
  const rl = await rateLimit("react", 60, 60_000);
  if (!rl.ok) return;

  const kind = String(formData.get("kind") ?? "") as ReactionTargetKind;
  const target_id = String(formData.get("target_id") ?? "");
  const emoji = String(formData.get("emoji") ?? "");

  if (kind !== "post" && kind !== "comment") return;
  if (!isValidEmoji(emoji)) return;

  // Validate target exists (and grab post id for revalidation).
  let postId: string | null = null;
  if (kind === "post") {
    const p = getPost(target_id);
    if (!p) return;
    postId = p.id;
  } else {
    const c = getComment(target_id);
    if (!c) return;
    postId = c.post_id;
  }

  const user = await currentUser();
  if (user) {
    toggleReaction(user.id, kind, target_id, emoji);
  } else {
    const anonId = await getOrSetAnonId();
    toggleAnonReaction(anonId, kind, target_id, emoji);
  }

  if (postId) revalidatePath(`/post/${postId}`);
  revalidatePath("/");
}
