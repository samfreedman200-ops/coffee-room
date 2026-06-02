"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth";
import { setUserRole, type Role, getUserById } from "@/lib/users";
import {
  decideContributorRequest,
  getContributorRequest,
} from "@/lib/contributors";
import { decideSubmission, getSubmission } from "@/lib/submissions";
import { insertPost } from "@/lib/posts";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { decideReport } from "@/lib/reports";
import { logger } from "@/lib/log";

const ROLES: ReadonlySet<Role> = new Set(["user", "contributor", "admin"]);

export async function changeUserRole(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!ROLES.has(role)) return;
  const target = getUserById(userId);
  if (!target) return;
  if (target.id === admin.id && role !== "admin") return;

  setUserRole(userId, role);
  audit({
    actorId: admin.id,
    action: "set_role",
    targetKind: "user",
    targetId: userId,
    note: `${target.role} → ${role}`,
  });
  logger.info("admin.role_changed", {
    admin_id: admin.id,
    user_id: userId,
    from: target.role,
    to: role,
  });
  revalidatePath("/admin");
  revalidatePath(`/u/${target.username}`);
}

export async function decideContributor(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reqId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (decision !== "approved" && decision !== "rejected") return;
  const req = getContributorRequest(reqId);
  if (!req || req.status !== "pending") return;

  decideContributorRequest(reqId, decision, admin.id, note);
  if (decision === "approved") {
    const target = getUserById(req.user_id);
    if (target && target.role === "user") {
      setUserRole(target.id, "contributor");
    }
  }
  createNotification(req.user_id, "contributor_decided", {
    status: decision,
    note,
  });
  audit({
    actorId: admin.id,
    action: `contributor_${decision}`,
    targetKind: "user",
    targetId: req.user_id,
    note,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/contributors");
  revalidatePath("/contributor/request");
}

export async function decideSubmissionAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();
  const subId = String(formData.get("submission_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (decision !== "approved" && decision !== "rejected") return;
  const sub = getSubmission(subId);
  if (!sub || sub.status !== "pending") return;

  let publishedPostId: string | null = null;

  if (decision === "approved") {
    const author = getUserById(sub.user_id);
    const handle = author ? `@${author.username}` : "anonymous";
    const postId = nanoid(10);
    insertPost({
      id: postId,
      title: sub.title,
      body: sub.body,
      handle,
      user_id: sub.user_id,
      via_submission_id: null,
      status: "published",
      edited_at: null,
      removed_by: null,
      image_path: null,
      created_at: Date.now(),
    });
    db()
      .prepare(`UPDATE posts SET via_submission_id = ? WHERE id = ?`)
      .run(sub.id, postId);
    publishedPostId = postId;
  }

  decideSubmission(subId, decision, admin.id, note, publishedPostId);
  createNotification(sub.user_id, "submission_decided", {
    submission_id: sub.id,
    title: sub.title,
    status: decision,
    note,
    post_id: publishedPostId,
  });
  audit({
    actorId: admin.id,
    action: `submission_${decision}`,
    targetKind: "submission",
    targetId: sub.id,
    note,
  });
  logger.info("admin.submission_decided", {
    admin_id: admin.id,
    submission_id: sub.id,
    author_user_id: sub.user_id,
    decision,
    post_id: publishedPostId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${subId}`);
  revalidatePath("/submissions");
  revalidatePath(`/submissions/${subId}`);
  if (publishedPostId) {
    revalidatePath("/");
    revalidatePath(`/post/${publishedPostId}`);
  }

  redirect("/admin/submissions");
}

export async function decideReportAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "dismissed" && decision !== "actioned") return;
  decideReport(reportId, decision, admin.id);
  audit({
    actorId: admin.id,
    action: `report_${decision}`,
    targetKind: "report",
    targetId: reportId,
  });
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}
