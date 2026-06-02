"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import { insertSubmission } from "@/lib/submissions";

export async function createSubmission(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "contributor" && user.role !== "admin") {
    redirect("/contributor/request");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || title.length > 200) {
    redirect(
      `/submissions/new?error=${encodeURIComponent("Title is required (max 200 chars).")}`,
    );
  }
  if (body.length < 100 || body.length > 50_000) {
    redirect(
      `/submissions/new?error=${encodeURIComponent("Body must be 100–50,000 characters.")}`,
    );
  }

  const id = nanoid(12);
  insertSubmission({
    id,
    user_id: user.id,
    title,
    body,
    status: "pending",
    decision_note: null,
    published_post_id: null,
    created_at: Date.now(),
    decided_at: null,
    decided_by: null,
  });

  revalidatePath("/submissions");
  revalidatePath("/admin");
  revalidatePath("/admin/submissions");
  redirect("/submissions");
}
