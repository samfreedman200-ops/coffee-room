import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "./db";
import { getUserById, type User } from "./users";
import { COOKIE_SECURE } from "./env";

const SESSION_COOKIE = "cr_sid";
const SESSION_DURATION_MS = 60 * 60 * 24 * 30 * 1000; // 30 days

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "anonymous",
  "anon",
  "api",
  "deleted",
  "everyone",
  "help",
  "me",
  "mod",
  "moderator",
  "null",
  "root",
  "staff",
  "support",
  "system",
  "team",
  "undefined",
  "you",
]);

export function validateUsername(u: string): string | null {
  if (!u) return "Username required.";
  if (!USERNAME_RE.test(u))
    return "3–24 chars, letters/numbers/underscore only.";
  if (RESERVED_USERNAMES.has(u.toLowerCase()))
    return "That username is reserved.";
  return null;
}

export function validatePassword(p: string): string | null {
  if (!p) return "Password required.";
  if (p.length < 8) return "At least 8 characters.";
  if (p.length > 200) return "Too long.";
  return null;
}

export async function hashPassword(p: string): Promise<string> {
  return bcrypt.hash(p, 10);
}

export async function verifyPassword(
  p: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(p, hash);
}

// Recovery phrase: 4 groups of 5 base32 chars, e.g. "K7QZX-92MWP-RT4JN-8B6HF"
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export function generateRecoveryPhrase(): string {
  const groups: string[] = [];
  const bytes = crypto.randomBytes(20);
  for (let g = 0; g < 4; g++) {
    let s = "";
    for (let i = 0; i < 5; i++) {
      s += ALPHABET[bytes[g * 5 + i] % ALPHABET.length];
    }
    groups.push(s);
  }
  return groups.join("-");
}

export async function hashRecovery(phrase: string): Promise<string> {
  return bcrypt.hash(phrase.toUpperCase().replace(/-/g, ""), 10);
}

export async function verifyRecovery(
  phrase: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(phrase.toUpperCase().replace(/-/g, ""), hash);
}

export async function createSession(userId: string): Promise<void> {
  const id = nanoid(32);
  const now = Date.now();
  db()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(id, userId, now, now + SESSION_DURATION_MS);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) {
    db().prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
  }
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const row = db()
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE id = ?`)
    .get(sid) as { user_id: string; expires_at: number } | undefined;

  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db().prepare(`DELETE FROM sessions WHERE id = ?`).run(sid);
    return null;
  }

  return getUserById(row.user_id) ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("Forbidden");
  return u;
}

/**
 * Reject any `next=` value that could escape the site (open redirect).
 * Only accept root-relative URLs like `/foo`, not `//evil.com` or
 * `https://evil.com`. Returns a safe default if validation fails.
 */
export function safeNext(next: string | undefined, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;
  return next;
}

/**
 * Invalidate every active session for a user EXCEPT the one identified by
 * `keepId`. Used after a password change so previously stolen sessions
 * can't outlive the password change event.
 */
export function deleteOtherSessions(
  userId: string,
  keepId: string | null,
): void {
  if (keepId) {
    db()
      .prepare(`DELETE FROM sessions WHERE user_id = ? AND id != ?`)
      .run(userId, keepId);
  } else {
    db().prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
  }
}

export async function currentSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}
