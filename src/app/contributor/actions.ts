"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import {
  getLatestRequestForUser,
  insertContributorRequest,
} from "@/lib/contributors";

export async function submitContributorRequest(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();

  if (user.role === "contributor" || user.role === "admin") {
    redirect("/contributor/request?error=already_contributor");
  }

  const existing = getLatestRequestForUser(user.id);
  if (existing && existing.status === "pending") {
    redirect("/contributor/request?error=pending");
  }

  const pitch = String(formData.get("pitch") ?? "").trim();
  if (pitch.length < 50 || pitch.length > 2000) {
    redirect(
      `/contributor/request?error=${encodeURIComponent("Pitch must be 50–2000 characters.")}`,
    );
  }

  insertContributorRequest({
    id: nanoid(12),
    user_id: user.id,
    pitch,
    status: "pending",
    decision_note: null,
    created_at: Date.now(),
    decided_at: null,
    decided_by: null,
  });

  revalidatePath("/contributor/request");
  revalidatePath("/admin");
  revalidatePath("/admin/contributors");
  redirect("/contributor/request?ok=1");
}
