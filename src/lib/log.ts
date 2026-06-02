import "server-only";

/**
 * Tiny zero-dep structured logger. One JSON object per line to stdout —
 * trivially parseable by Loki, Vector, or `jq`. No PII or auth secrets;
 * pass an event name + a small context bag.
 *
 *   logger.info("post.created", { post_id: id, anon: !user })
 *   logger.warn("auth.login_failed", { username })
 *   logger.error("avatar.processing_failed", { user_id: u.id, err: msg })
 *
 * In development we pretty-print so the dev console stays readable.
 */

type Level = "debug" | "info" | "warn" | "error";

const IS_PROD = process.env.NODE_ENV === "production";

function emit(level: Level, event: string, ctx: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
  };
  if (IS_PROD) {
    // One JSON line per record.
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    // Compact human-friendly format in dev. Don't drop fields.
    const tail = Object.keys(ctx).length > 0 ? " " + JSON.stringify(ctx) : "";
    process.stdout.write(`[${level}] ${event}${tail}\n`);
  }
}

export const logger = {
  debug(event: string, ctx: Record<string, unknown> = {}) {
    if (!IS_PROD) emit("debug", event, ctx);
  },
  info(event: string, ctx: Record<string, unknown> = {}) {
    emit("info", event, ctx);
  },
  warn(event: string, ctx: Record<string, unknown> = {}) {
    emit("warn", event, ctx);
  },
  error(event: string, ctx: Record<string, unknown> = {}) {
    emit("error", event, ctx);
  },
};
