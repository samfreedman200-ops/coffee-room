"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSession,
  deleteOtherSessions,
  hashPassword,
  validatePassword,
  verifyRecovery,
} from "@/lib/auth";
import { getUserByUsername, updateUserPassword } from "@/lib/users";
import {
  getSecurityQuestions,
  MIN_CORRECT_TO_RECOVER,
  REQUIRED_QUESTIONS,
  verifyAnswer,
} from "@/lib/security-questions";
import { rateLimit, check as checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/log";

function back(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/recover?${qs}`);
}

// Generic message used wherever we'd otherwise reveal whether a username
// exists. Pairs with aggressive rate-limiting so brute-forcing is bounded.
const GENERIC_ERR = "Couldn't verify. Check what you entered and try again.";

export async function recoverWithPhrase(formData: FormData): Promise<void> {
  const ipRl = await rateLimit("recover_phrase_ip", 8, 60 * 60_000); // 8/hr/IP
  if (!ipRl.ok) {
    back({
      method: "phrase",
      error: "Too many recovery attempts from your network. Try again later.",
    });
  }

  const username = String(formData.get("username") ?? "").trim();
  const phrase = String(formData.get("phrase") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "");

  const passErr = validatePassword(newPassword);
  if (passErr) back({ method: "phrase", error: passErr });

  // Per-username throttle so the IP limit isn't bypassed via a botnet.
  const userRl = checkRateLimit(
    `recover_phrase_user:${username.toLowerCase()}`,
    10,
    60 * 60_000,
  );
  if (!userRl.ok) {
    back({ method: "phrase", error: GENERIC_ERR });
  }

  const user = getUserByUsername(username);
  if (!user) back({ method: "phrase", error: GENERIC_ERR });

  const ok = await verifyRecovery(phrase, user.recovery_hash);
  if (!ok) back({ method: "phrase", error: GENERIC_ERR });

  updateUserPassword(user.id, await hashPassword(newPassword));
  // Invalidate any other active sessions so a stolen session can't outlive
  // the password change.
  deleteOtherSessions(user.id, null);
  await createSession(user.id);
  audit({
    actorId: user.id,
    action: "password_reset_phrase",
    targetKind: "user",
    targetId: user.id,
  });
  logger.warn("auth.password_reset", { method: "phrase", user_id: user.id });
  revalidatePath("/");
  redirect("/me");
}

export async function startQuestionRecovery(formData: FormData): Promise<void> {
  const ipRl = await rateLimit("recover_q_start_ip", 20, 60 * 60_000);
  if (!ipRl.ok) {
    back({ method: "questions", error: "Too many requests. Try again later." });
  }

  const username = String(formData.get("username") ?? "").trim();
  // Always redirect to the questions page, even if the username doesn't
  // exist. The downstream page detects missing user, but the START step
  // doesn't reveal that. (Determined attackers can still infer from the
  // questions page's behavior; we accept that as a UX trade-off.)
  redirect(`/recover/questions?username=${encodeURIComponent(username)}`);
}

export async function recoverWithQuestions(formData: FormData): Promise<void> {
  const ipRl = await rateLimit("recover_q_ip", 8, 60 * 60_000);
  if (!ipRl.ok) {
    back({
      method: "questions",
      error: "Too many recovery attempts from your network. Try again later.",
    });
  }

  const username = String(formData.get("username") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "");

  const passErr = validatePassword(newPassword);
  if (passErr) {
    redirect(
      `/recover/questions?username=${encodeURIComponent(username)}&error=${encodeURIComponent(passErr)}`,
    );
  }

  const userRl = checkRateLimit(
    `recover_q_user:${username.toLowerCase()}`,
    10,
    60 * 60_000,
  );
  if (!userRl.ok) {
    redirect(
      `/recover/questions?username=${encodeURIComponent(username)}&error=${encodeURIComponent(GENERIC_ERR)}`,
    );
  }

  const user = getUserByUsername(username);
  if (!user) {
    redirect(
      `/recover/questions?username=${encodeURIComponent(username)}&error=${encodeURIComponent(GENERIC_ERR)}`,
    );
  }

  const stored = getSecurityQuestions(user.id);
  if (stored.length === 0) {
    redirect(
      `/recover?method=questions&error=${encodeURIComponent("This account has no security questions. Use the recovery phrase instead.")}`,
    );
  }

  let correct = 0;
  for (let i = 0; i < REQUIRED_QUESTIONS; i++) {
    const s = stored[i];
    if (!s) continue;
    const submitted = String(formData.get(`a${i}`) ?? "").trim();
    if (!submitted) continue;
    if (await verifyAnswer(submitted, s.answer_hash)) correct++;
  }

  if (correct < MIN_CORRECT_TO_RECOVER) {
    redirect(
      `/recover/questions?username=${encodeURIComponent(username)}&error=${encodeURIComponent(
        `You got ${correct} of ${REQUIRED_QUESTIONS} right. Need at least ${MIN_CORRECT_TO_RECOVER}.`,
      )}`,
    );
  }

  updateUserPassword(user.id, await hashPassword(newPassword));
  deleteOtherSessions(user.id, null);
  await createSession(user.id);
  audit({
    actorId: user.id,
    action: "password_reset_questions",
    targetKind: "user",
    targetId: user.id,
  });
  logger.warn("auth.password_reset", {
    method: "questions",
    user_id: user.id,
    correct,
  });
  revalidatePath("/");
  redirect("/me");
}
