#!/usr/bin/env node
/**
 * Remove orphan avatar files from public/avatars/.
 *
 * Compares files on disk against `users.id` rows that have an `avatar_path`
 * set. Anything on disk that isn't claimed by a live user is deleted.
 * Anything in the DB but missing from disk is reported but not changed.
 *
 * Safe to run at any time; pair with the backup script in a nightly cron.
 *
 * Usage:
 *   node scripts/sweep-avatars.mjs            # dry run, just prints
 *   node scripts/sweep-avatars.mjs --apply    # actually delete
 */

import { readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve, parse } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const DB_PATH = join(projectRoot, "data", "coffee-room.db");
const AVATAR_DIR = join(projectRoot, "public", "avatars");

const APPLY = process.argv.includes("--apply");

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`No DB found at ${DB_PATH}. Aborting.`);
    process.exit(1);
  }
  if (!existsSync(AVATAR_DIR)) {
    console.log(`No avatar dir at ${AVATAR_DIR}. Nothing to do.`);
    process.exit(0);
  }

  const db = new Database(DB_PATH, { readonly: !APPLY });
  // We need user_id and the basename of avatar_path. Strip the "/avatars/"
  // prefix and compare the bare filename.
  const claimedFiles = new Set();
  const claimedUserIds = new Set();
  const rows = db
    .prepare(
      `SELECT id, avatar_path FROM users WHERE avatar_path IS NOT NULL`,
    )
    .all();
  for (const r of rows) {
    if (typeof r.avatar_path !== "string") continue;
    const base = r.avatar_path.split("/").pop();
    if (base) {
      claimedFiles.add(base);
      claimedUserIds.add(r.id);
    }
  }
  db.close();

  let orphaned = 0;
  let kept = 0;
  let missingOnDisk = 0;

  // Files on disk → orphan check.
  for (const name of readdirSync(AVATAR_DIR)) {
    const full = join(AVATAR_DIR, name);
    try {
      if (!statSync(full).isFile()) continue;
    } catch {
      continue;
    }
    if (claimedFiles.has(name)) {
      kept++;
      continue;
    }
    orphaned++;
    if (APPLY) {
      try {
        rmSync(full);
        console.log(`removed orphan: ${name}`);
      } catch (e) {
        console.error(`failed to remove ${name}:`, e);
      }
    } else {
      console.log(`would remove orphan: ${name}`);
    }
  }

  // DB rows → disk check.
  for (const name of claimedFiles) {
    if (!existsSync(join(AVATAR_DIR, name))) {
      missingOnDisk++;
      console.log(`claimed but missing on disk: ${name}`);
    }
  }

  console.log(
    `\nsummary: ${kept} kept, ${orphaned} orphan, ${missingOnDisk} missing on disk` +
      (APPLY ? "" : " (dry run — re-run with --apply to delete orphans)"),
  );
}

main();
