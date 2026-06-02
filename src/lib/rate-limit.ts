import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = Date.now();

function prune(now: number): void {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  for (const [k, v] of buckets) {
    if (v.resetAt < now) buckets.delete(k);
  }
  lastPrune = now;
}

export async function clientKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real;
  return "anon";
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetIn: number;
};

/**
 * Token bucket-ish: allow `limit` events per `windowMs` per key.
 * Returns ok=false when the cap is hit. Pure in-memory, single-process.
 */
export function check(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetIn: windowMs };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetIn: existing.resetAt - now };
  }
  existing.count++;
  return {
    ok: true,
    remaining: limit - existing.count,
    resetIn: existing.resetAt - now,
  };
}

export async function rateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const k = `${bucket}:${await clientKey()}`;
  return check(k, limit, windowMs);
}
