/**
 * Centralized environment access. Keep `process.env` reads here so settings
 * are typed, named, and have sensible defaults.
 */

export const IS_PROD = process.env.NODE_ENV === "production";

/** Canonical public origin for OG, RSS, sitemap. e.g. https://example.com */
export const SITE_URL =
  process.env.SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

/** Display name used in metadata. */
export const SITE_NAME = process.env.SITE_NAME ?? "Coffee Room";

/** Short tagline for OG/RSS. */
export const SITE_DESCRIPTION =
  process.env.SITE_DESCRIPTION ?? "An anonymous blog. Quiet conversations.";

/** Cookie security flag — enable HTTPS-only cookies in production. */
export const COOKIE_SECURE = IS_PROD;
