"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import {
  deleteComment,
  deletePost,
  getComment,
  getPost,
  insertComment,
  insertPost,
  setCommentStatus,
  setPostStatus,
  updateCommentBody,
  updatePostBody,
} from "@/lib/posts";
import { generateHandle } from "@/lib/handles";
import { currentUser, requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { insertReport } from "@/lib/reports";
import { db } from "@/lib/db";
import { COOKIE_SECURE } from "@/lib/env";
import { logger } from "@/lib/log";
import { savePostImage } from "@/lib/post-image";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

async function handleForPost(postId: string): Promise<string> {
  const jar = await cookies();
  const key = `cr_h_${postId}`;
  const existing = jar.get(key)?.value;
  if (existing) return existing;
  const fresh = generateHandle();
  jar.set(key, fresh, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
  return fresh;
}

async function anonAuthorHandle(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get("cr_author")?.value;
  if (existing) return existing;
  const fresh = generateHandle();
  jar.set("cr_author", fresh, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
  });
  return fresh;
}

export async function createPost(formData: FormData): Promise<void> {
  const rl = await rateLimit("post", 5, 60_000);
  if (!rl.ok) {
    redirect(`/new?error=${encodeURIComponent("Slow down a moment — too many posts.")}`);
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const postAnonymously = String(formData.get("anon") ?? "") === "on";

  if (!title || title.length > 200) return;
  if (!body || body.length > 10_000) return;

  const user = await currentUser();
  const id = nanoid(10);

  // Optional hero image. Processed through sharp like avatars (resize +
  // EXIF strip), stored as WebP.
  let image_path: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await savePostImage(id, file);
    if (typeof result === "string") {
      image_path = result;
    } else {
      redirect(`/new?error=${encodeURIComponent(result.error)}`);
    }
  }

  const handle =
    user && !postAnonymously ? `@${user.username}` : await anonAuthorHandle();

  insertPost({
    id,
    title,
    body,
    handle,
    user_id: user && !postAnonymously ? user.id : null,
    via_submission_id: null,
    status: "published",
    edited_at: null,
    removed_by: null,
    image_path,
    created_at: Date.now(),
  });
  logger.info("post.created", {
    post_id: id,
    user_id: user?.id ?? null,
    anon: !user || postAnonymously,
    length: body.length,
  });

  revalidatePath("/");
  if (user) revalidatePath(`/u/${user.username}`);
  redirect(`/post/${id}`);
}

export async function createComment(formData: FormData): Promise<void> {
  const rl = await rateLimit("comment", 10, 60_000);
  if (!rl.ok) return;

  const postId = String(formData.get("post_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const parentIdRaw = String(formData.get("parent_id") ?? "").trim();
  const commentAnonymously =
    String(formData.get("anon") ?? "") === "on";

  if (!postId || !body || body.length > 5_000) return;
  const post = getPost(postId);
  if (!post) return;

  let parentId: string | null = null;
  if (parentIdRaw) {
    const parent = getComment(parentIdRaw);
    if (parent && parent.post_id === postId) parentId = parent.id;
  }

  const user = await currentUser();
  const handle =
    user && !commentAnonymously ? `@${user.username}` : await handleForPost(postId);

  const commentId = nanoid(10);
  insertComment({
    id: commentId,
    post_id: postId,
    body,
    handle,
    user_id: user && !commentAnonymously ? user.id : null,
    parent_id: parentId,
    status: "published",
    edited_at: null,
    removed_by: null,
    created_at: Date.now(),
  });

  // Notify the post author (if account-attributed and not self) or parent comment author.
  if (parentId) {
    const parent = getComment(parentId);
    if (
      parent?.user_id &&
      parent.user_id !== user?.id
    ) {
      createNotification(parent.user_id, "reply_to_comment", {
        post_id: postId,
        comment_id: commentId,
        actor: user ? `@${user.username}` : handle,
      });
    }
  } else if (post.user_id && post.user_id !== user?.id) {
    createNotification(post.user_id, "comment_on_post", {
      post_id: postId,
      comment_id: commentId,
      actor: user ? `@${user.username}` : handle,
    });
  }

  revalidatePath(`/post/${postId}`);
}

export async function editPost(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || title.length > 200 || !body || body.length > 10_000) return;

  const post = getPost(id);
  if (!post) return;
  if (post.user_id !== user.id) return; // only owner can edit
  if (post.status !== "published") return; // can't edit removed/draft

  updatePostBody(id, title, body);
  revalidatePath(`/post/${id}`);
  revalidatePath("/");
  redirect(`/post/${id}`);
}

export async function editComment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 5_000) return;

  const comment = getComment(id);
  if (!comment) return;
  if (comment.user_id !== user.id) return;
  if (comment.status !== "published") return;

  updateCommentBody(id, body);
  revalidatePath(`/post/${comment.post_id}`);
}

export async function deleteOwnPost(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const post = getPost(id);
  if (!post) return;
  if (post.user_id !== user.id) return;

  deletePost(id);
  audit({
    actorId: user.id,
    action: "owner_delete_post",
    targetKind: "post",
    targetId: id,
  });
  revalidatePath("/");
  revalidatePath(`/u/${user.username}`);
  redirect("/");
}

export async function deleteOwnComment(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const comment = getComment(id);
  if (!comment) return;
  if (comment.user_id !== user.id) return;

  deleteComment(id);
  audit({
    actorId: user.id,
    action: "owner_delete_comment",
    targetKind: "comment",
    targetId: id,
  });
  revalidatePath(`/post/${comment.post_id}`);
}

export async function adminRemovePost(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const post = getPost(id);
  if (!post) return;

  setPostStatus(id, "removed", user.id);
  audit({
    actorId: user.id,
    action: "admin_remove_post",
    targetKind: "post",
    targetId: id,
    note,
  });
  logger.warn("moderation.post_removed", {
    post_id: id,
    admin_id: user.id,
    target_user_id: post.user_id ?? null,
  });
  if (post.user_id && post.user_id !== user.id) {
    createNotification(post.user_id, "report_received", {
      post_id: id,
      action: "removed",
      note,
    });
  }
  revalidatePath("/");
  revalidatePath(`/post/${id}`);
}

export async function adminRemoveComment(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") return;
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const comment = getComment(id);
  if (!comment) return;

  setCommentStatus(id, "removed", user.id);
  audit({
    actorId: user.id,
    action: "admin_remove_comment",
    targetKind: "comment",
    targetId: id,
    note,
  });
  logger.warn("moderation.comment_removed", {
    comment_id: id,
    admin_id: user.id,
    target_user_id: comment.user_id ?? null,
  });
  if (comment.user_id && comment.user_id !== user.id) {
    createNotification(comment.user_id, "report_received", {
      comment_id: id,
      action: "removed",
      note,
    });
  }
  revalidatePath(`/post/${comment.post_id}`);
}

export async function reportContent(formData: FormData): Promise<void> {
  const user = await requireUser();
  const kindRaw = String(formData.get("kind") ?? "");
  const target_id = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason || reason.length > 1000) return;
  if (kindRaw !== "post" && kindRaw !== "comment") return;

  const rl = await rateLimit("report", 5, 60_000);
  if (!rl.ok) return;

  // Verify target exists.
  if (kindRaw === "post") {
    if (!getPost(target_id)) return;
  } else {
    if (!getComment(target_id)) return;
  }

  // Dedupe: one open report per reporter per target.
  const dup = (
    db()
      .prepare(
        `SELECT 1 FROM reports
         WHERE reporter_id = ? AND target_kind = ? AND target_id = ?
           AND status = 'open' LIMIT 1`,
      )
      .get(user.id, kindRaw, target_id) as { 1: 1 } | undefined
  );
  if (dup) return;

  insertReport({
    id: nanoid(12),
    reporter_id: user.id,
    target_kind: kindRaw,
    target_id,
    reason,
    status: "open",
    created_at: Date.now(),
    decided_at: null,
    decided_by: null,
  });
  audit({
    actorId: user.id,
    action: "report_filed",
    targetKind: kindRaw,
    targetId: target_id,
  });

  revalidatePath("/admin/reports");
}
