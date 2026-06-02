"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getUserByUsername } from "@/lib/users";
import { follow, unfollow } from "@/lib/follows";
import { createNotification } from "@/lib/notifications";

export async function toggleFollow(formData: FormData): Promise<void> {
  const me = await requireUser();
  const username = String(formData.get("username") ?? "").trim();
  const target = getUserByUsername(username);
  if (!target) return;
  if (target.id === me.id) return;

  const wantUnfollow = String(formData.get("action") ?? "") === "unfollow";

  if (wantUnfollow) {
    unfollow(me.id, target.id);
  } else {
    const added = follow(me.id, target.id);
    if (added) {
      createNotification(target.id, "new_follower", {
        from_username: me.username,
      });
    }
  }

  revalidatePath(`/u/${target.username}`);
  revalidatePath("/feed");
}
