#!/usr/bin/env node
/**
 * Snapshot the SQLite database into ./backups.
 * Uses the SQLite VACUUM INTO command for a clean, atomic copy that is safe
 * to take while the app is running (no torn WAL, no partial writes).
 *
 * Usage:
 *   node scripts/backup.mjs            # → backups/YYYY-MM-DDTHHMMSS.db
 *   node scripts/backup.mjs --keep 14  # also prunes copies older than 14 days
 *
 * Recommended cron (Linux):
 *   0 3 * * *  cd /srv/coffee-room && /usr/bin/node scripts/backup.mjs --keep 30
 *
 * Recommended Task Scheduler (Windows):
 *   Daily at 03:00, run `node` with arguments `scripts\backup.mjs --keep 30`
 *   and "Start in" set to the project directory.
 */

import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const DB_PATH = join(projectRoot, "data", "coffee-room.db");
const BACKUP_DIR = join(projectRoot, "backups");

const args = process.argv.slice(2);
const keepIdx = args.indexOf("--keep");
const keepDays =
  keepIdx >= 0 && args[keepIdx + 1] ? parseInt(args[keepIdx + 1], 10) : null;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "").replace(/Z$/, "");
}

function main() {
  if (!existsSync(DB_PATH)) {
    console.error(`No DB found at ${DB_PATH}. Nothing to back up.`);
    process.exit(1);
  }
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const dest = join(BACKUP_DIR, `${timestamp()}.db`);
  const db = new Database(DB_PATH, { readonly: true });
  // VACUUM INTO produces a self-contained, defragmented copy. Faster than
  // dump-then-reload and safe while the app holds the original open.
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  db.close();
  const sizeMb = (statSync(dest).size / (1024 * 1024)).toFixed(2);
  console.log(`backup -> ${dest} (${sizeMb} MB)`);

  if (keepDays !== null && Number.isFinite(keepDays) && keepDays > 0) {
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const f of readdirSync(BACKUP_DIR)) {
      if (!f.endsWith(".db")) continue;
      const p = join(BACKUP_DIR, f);
      try {
        if (statSync(p).mtimeMs < cutoff) {
          rmSync(p);
          removed++;
        }
      } catch {
        /* ignore */
      }
    }
    if (removed > 0) console.log(`pruned ${removed} old backup(s)`);
  }
}

main();
