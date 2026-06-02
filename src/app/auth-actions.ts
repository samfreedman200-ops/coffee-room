"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import {
  createSession,
  destroySession,
  generateRecoveryPhrase,
  hashPassword,
  hashRecovery,
  safeNext,
  validatePassword,
  validateUsername,
  verifyPassword,
} from "@/lib/auth";
import {
  getUserByUsername,
  insertFirstOrUserAtomic,
} from "@/lib/users";
import {
  hashAnswer,
  insertSecurityQuestions,
  isValidQuestionKey,
  REQUIRED_QUESTIONS,
} from "@/lib/security-questions";
import { check as checkRateLimit, rateLimit } from "@/lib/rate-limit";
import { COOKIE_SECURE } from "@/lib/env";
import { logger } from "@/lib/log";

const PENDING_RECOVERY = "cr_pending_recovery";

export async function signup(formData: FormData): Promise<void> {
  const rl = await rateLimit("signup", 3, 60 * 60_000); // 3 / hour / IP
  if (!rl.ok) {
    redirect(
      `/signup?error=${encodeURIComponent("Too many signups from your network. Try again later.")}`,
    );
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/me"), "/me");

  const usernameError = validateUsername(username);
  if (usernameError) redirect(`/signup?error=${encodeURIComponent(usernameError)}`);
  const passwordError = validatePassword(password);
  if (passwordError) redirect(`/signup?error=${encodeURIComponent(passwordError)}`);

  // Collect security questions + answers (4 required).
  const qa: Array<{ question_key: string; answer: string }> = [];
  for (let i = 0; i < REQUIRED_QUESTIONS; i++) {
    const key = String(formData.get(`q${i}_key`) ?? "").trim();
    const ans = String(formData.get(`q${i}_answer`) ?? "").trim();
    if (!key || !isValidQuestionKey(key)) {
      redirect(
        `/signup?error=${encodeURIComponent("Pick a security question for every slot.")}`,
      );
    }
    if (!ans || ans.length < 2) {
      redirect(
        `/signup?error=${encodeURIComponent("Answer every security question (at least 2 characters).")}`,
      );
    }
    qa.push({ question_key: key, answer: ans });
  }
  const uniqueKeys = new Set(qa.map((x) => x.question_key));
  if (uniqueKeys.size !== REQUIRED_QUESTIONS) {
    redirect(
      `/signup?error=${encodeURIComponent("Pick four different security questions.")}`,
    );
  }

  if (getUserByUsername(username)) {
    redirect(`/signup?error=${encodeURIComponent("Username already taken.")}`);
  }

  const recovery = generateRecoveryPhrase();
  const id = nanoid(12);

  // Atomic: check-empty + insert inside one SQLite transaction so two
  // simultaneous first-user signups can't both win admin.
  const role = insertFirstOrUserAtomic({
    id,
    username,
    password_hash: await hashPassword(password),
    recovery_hash: await hashRecovery(recovery),
    avatar_path: null,
    bio: null,
    created_at: Date.now(),
  });
  logger.info("auth.signup", { user_id: id, role });

  const qaHashed = await Promise.all(
    qa.map(async (x) => ({
      question_key: x.question_key,
      answer_hash: await hashAnswer(x.answer),
    })),
  );
  insertSecurityQuestions(id, qaHashed);

  await createSession(id);

  const jar = await cookies();
  jar.set(PENDING_RECOVERY, recovery, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  revalidatePath("/");
  redirect(`/signup/recovery?next=${encodeURIComponent(next)}`);
}

export async function login(formData: FormData): Promise<void> {
  const rl = await rateLimit("login", 10, 10 * 60_000); // 10 / 10 min / IP
  if (!rl.ok) {
    redirect(
      `/login?error=${encodeURIComponent("Too many attempts. Try again in a few minutes.")}`,
    );
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/me"), "/me");

  // Per-username throttle (no IP component, so distributed brute force
  // is also bounded).
  const userRl = checkRateLimit(
    `login_user:${username.toLowerCase()}`,
    15,
    30 * 60_000,
  );
  if (!userRl.ok) {
    redirect(
      `/login?error=${encodeURIComponent("Too many attempts for this account. Try again later.")}`,
    );
  }

  const user = getUserByUsername(username);
  if (!user) {
    logger.warn("auth.login_failed", { reason: "unknown_user" });
    redirect(`/login?error=${encodeURIComponent("Invalid username or password.")}`);
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    logger.warn("auth.login_failed", {
      reason: "bad_password",
      user_id: user.id,
    });
    redirect(`/login?error=${encodeURIComponent("Invalid username or password.")}`);
  }

  await createSession(user.id);
  logger.info("auth.login", { user_id: user.id });
  revalidatePath("/");
  redirect(next);
}

export async function logout(): Promise<void> {
  await destroySession();
  revalidatePath("/");
  redirect("/");
}
