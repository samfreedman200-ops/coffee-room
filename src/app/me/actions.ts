"use server";

import path from "node:path";
import fs from "node:fs/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logout as logoutImpl } from "@/app/auth-actions";
import {
  currentSessionId,
  deleteOtherSessions,
  destroySession,
  hashPassword,
  requireUser,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";
import { saveAvatar } from "@/lib/avatar";
import {
  updateUserAvatar,
  updateUserBio,
  updateUserPassword,
} from "@/lib/users";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/log";

export async function updateProfile(formData: FormData): Promise<void> {
  const user = await requireUser();

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 280) || null;
  updateUserBio(user.id, bio);

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const result = await saveAvatar(user.id, file);
    if (typeof result === "string") {
      updateUserAvatar(user.id, result);
    } else {
      redirect(`/me?error=${encodeURIComponent(result.error)}`);
    }
  }

  revalidatePath("/me");
  revalidatePath(`/u/${user.username}`);
  redirect("/me");
}

export async function logout(): Promise<void> {
  await logoutImpl();
}

export async function changePassword(formData: FormData): Promise<void> {
  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const passErr = validatePassword(next);
  if (passErr) {
    redirect(`/me/password?error=${encodeURIComponent(passErr)}`);
  }
  if (next !== confirm) {
    redirect(`/me/password?error=${encodeURIComponent("Passwords don't match.")}`);
  }
  if (!(await verifyPassword(current, user.password_hash))) {
    redirect(`/me/password?error=${encodeURIComponent("Current password is wrong.")}`);
  }

  updateUserPassword(user.id, await hashPassword(next));
  // Keep the current session alive, kill every other one.
  deleteOtherSessions(user.id, await currentSessionId());
  audit({ actorId: user.id, action: "password_changed" });
  logger.info("auth.password_changed", { user_id: user.id });
  redirect("/me?notice=password_changed");
}

export async function deleteAccount(formData: FormData): Promise<void> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (confirm !== `delete @${user.username}`) {
    redirect(
      `/me/delete?error=${encodeURIComponent(
        `Type exactly: delete @${user.username}`,
      )}`,
    );
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    redirect(`/me/delete?error=${encodeURIComponent("Wrong password.")}`);
  }

  // Best-effort avatar cleanup before DB row goes away.
  if (user.avatar_path?.startsWith("/avatars/")) {
    const filename = user.avatar_path.slice("/avatars/".length);
    const fullPath = path.join(process.cwd(), "public", "avatars", filename);
    await fs.rm(fullPath, { force: true });
  }

  audit({
    actorId: user.id,
    action: "account_deleted",
    targetKind: "user",
    targetId: user.id,
    note: `username:${user.username}`,
  });
  logger.info("account.deleted", {
    user_id: user.id,
    username: user.username,
  });

  // Cascades remove sessions, security_questions, requests, submissions,
  // dm_threads, dm_messages, notifications, reactions, follows; posts/comments
  // are kept with user_id set to NULL.
  db().prepare(`DELETE FROM users WHERE id = ?`).run(user.id);

  await destroySession();
  redirect("/");
}
