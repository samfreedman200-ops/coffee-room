"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import {
  getOrCreateThread,
  insertMessage,
} from "@/lib/dms";
import { getUserByUsername } from "@/lib/users";
import { rateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function sendDm(formData: FormData): Promise<void> {
  const me = await requireUser();
  const rl = await rateLimit("dm", 30, 60_000);
  if (!rl.ok) return;

  const toUsername = String(formData.get("to_username") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!toUsername || !body) return;
  if (body.length > 5000) return;

  const other = getUserByUsername(toUsername);
  if (!other) return;
  if (other.id === me.id) return;

  const thread = getOrCreateThread(me.id, other.id);
  insertMessage({
    id: nanoid(12),
    thread_id: thread.id,
    sender_id: me.id,
    body,
    created_at: Date.now(),
    read_at: null,
  });

  createNotification(other.id, "dm", {
    from_username: me.username,
    preview: body.slice(0, 80),
  });

  revalidatePath("/dm");
  revalidatePath(`/dm/${toUsername}`);
}

export async function startThread(formData: FormData): Promise<void> {
  const me = await requireUser();
  const toUsername = String(formData.get("to_username") ?? "").trim();
  if (!toUsername) return;
  const other = getUserByUsername(toUsername);
  if (!other) return;
  if (other.id === me.id) return;
  getOrCreateThread(me.id, other.id);
  redirect(`/dm/${toUsername}`);
}
