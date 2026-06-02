import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "coffee-room.db");

let _db: Database.Database | null = null;
let _shutdownHooked = false;

function hookShutdown(instance: Database.Database): void {
  if (_shutdownHooked) return;
  _shutdownHooked = true;
  const close = () => {
    try {
      instance.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      /* best effort */
    }
    try {
      instance.close();
    } catch {
      /* best effort */
    }
  };
  process.on("SIGINT", () => {
    close();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    close();
    process.exit(0);
  });
  process.on("exit", close);
}

export function db(): Database.Database {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const instance = new Database(DB_PATH);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  instance.pragma("synchronous = NORMAL");
  instance.pragma("busy_timeout = 5000");
  hookShutdown(instance);

  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      username        TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT NOT NULL,
      recovery_hash   TEXT NOT NULL,
      avatar_path     TEXT,
      bio             TEXT,
      role            TEXT NOT NULL DEFAULT 'user'
                       CHECK (role IN ('user','contributor','admin')),
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS security_questions (
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      position      INTEGER NOT NULL,
      question_key  TEXT NOT NULL,
      answer_hash   TEXT NOT NULL,
      PRIMARY KEY (user_id, position)
    );
    CREATE INDEX IF NOT EXISTS idx_security_questions_user ON security_questions(user_id);

    CREATE TABLE IF NOT EXISTS posts (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      handle      TEXT NOT NULL,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      image_path  TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      body        TEXT NOT NULL,
      handle      TEXT NOT NULL,
      user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS contributor_requests (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pitch         TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
      decision_note TEXT,
      created_at    INTEGER NOT NULL,
      decided_at    INTEGER,
      decided_by    TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_contributor_requests_user ON contributor_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_contributor_requests_status ON contributor_requests(status);

    CREATE TABLE IF NOT EXISTS submissions (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title             TEXT NOT NULL,
      body              TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
      decision_note     TEXT,
      published_post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
      created_at        INTEGER NOT NULL,
      decided_at        INTEGER,
      decided_by        TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

    CREATE TABLE IF NOT EXISTS dm_threads (
      id              TEXT PRIMARY KEY,
      user_a          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      INTEGER NOT NULL,
      last_message_at INTEGER NOT NULL,
      UNIQUE (user_a, user_b)
    );
    CREATE INDEX IF NOT EXISTS idx_dm_threads_user_a ON dm_threads(user_a, last_message_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dm_threads_user_b ON dm_threads(user_b, last_message_at DESC);

    CREATE TABLE IF NOT EXISTS dm_messages (
      id         TEXT PRIMARY KEY,
      thread_id  TEXT NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
      sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at    INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON dm_messages(thread_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind         TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      read_at      INTEGER,
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
      ON notifications(user_id, read_at);

    CREATE TABLE IF NOT EXISTS reports (
      id            TEXT PRIMARY KEY,
      reporter_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_kind   TEXT NOT NULL CHECK (target_kind IN ('post','comment','user','dm')),
      target_id     TEXT NOT NULL,
      reason        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','dismissed','actioned')),
      created_at    INTEGER NOT NULL,
      decided_at    INTEGER,
      decided_by    TEXT REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      actor_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
      action      TEXT NOT NULL,
      target_kind TEXT,
      target_id   TEXT,
      note        TEXT,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

    CREATE TABLE IF NOT EXISTS reactions (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_kind TEXT NOT NULL CHECK (target_kind IN ('post','comment')),
      target_id   TEXT NOT NULL,
      emoji       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (user_id, target_kind, target_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_reactions_target
      ON reactions(target_kind, target_id);

    -- Anonymous reactions, keyed by a per-browser cookie id rather than a
    -- user row. Separated so account deletion doesn't cascade into them.
    CREATE TABLE IF NOT EXISTS anon_reactions (
      anon_id     TEXT NOT NULL,
      target_kind TEXT NOT NULL CHECK (target_kind IN ('post','comment')),
      target_id   TEXT NOT NULL,
      emoji       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (anon_id, target_kind, target_id, emoji)
    );
    CREATE INDEX IF NOT EXISTS idx_anon_reactions_target
      ON anon_reactions(target_kind, target_id);

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (follower_id, followee_id),
      CHECK (follower_id != followee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows(followee_id);
  `);

  // Migrations for older DBs.
  const postCols = instance.prepare(`PRAGMA table_info(posts)`).all() as Array<{ name: string }>;
  if (!postCols.some((c) => c.name === "user_id"))
    instance.exec(`ALTER TABLE posts ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
  if (!postCols.some((c) => c.name === "via_submission_id"))
    instance.exec(`ALTER TABLE posts ADD COLUMN via_submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL`);
  if (!postCols.some((c) => c.name === "status"))
    instance.exec(`ALTER TABLE posts ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`);
  if (!postCols.some((c) => c.name === "edited_at"))
    instance.exec(`ALTER TABLE posts ADD COLUMN edited_at INTEGER`);
  if (!postCols.some((c) => c.name === "removed_by"))
    instance.exec(`ALTER TABLE posts ADD COLUMN removed_by TEXT REFERENCES users(id) ON DELETE SET NULL`);
  if (!postCols.some((c) => c.name === "image_path"))
    instance.exec(`ALTER TABLE posts ADD COLUMN image_path TEXT`);

  const commentCols = instance.prepare(`PRAGMA table_info(comments)`).all() as Array<{ name: string }>;
  if (!commentCols.some((c) => c.name === "user_id"))
    instance.exec(`ALTER TABLE comments ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
  if (!commentCols.some((c) => c.name === "status"))
    instance.exec(`ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'published'`);
  if (!commentCols.some((c) => c.name === "edited_at"))
    instance.exec(`ALTER TABLE comments ADD COLUMN edited_at INTEGER`);
  if (!commentCols.some((c) => c.name === "parent_id"))
    instance.exec(`ALTER TABLE comments ADD COLUMN parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE`);
  if (!commentCols.some((c) => c.name === "removed_by"))
    instance.exec(`ALTER TABLE comments ADD COLUMN removed_by TEXT REFERENCES users(id) ON DELETE SET NULL`);

  instance.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_via_submission ON posts(via_submission_id);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
    CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
  `);

  // Full-text search via FTS5
  instance.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
      title, body, content='posts', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
      INSERT INTO posts_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
    CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
    END;
    CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
      INSERT INTO posts_fts(posts_fts, rowid, title, body) VALUES('delete', old.rowid, old.title, old.body);
      INSERT INTO posts_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;
  `);

  // Backfill FTS index if empty.
  const ftsCount = (instance.prepare(`SELECT COUNT(*) AS n FROM posts_fts`).get() as { n: number }).n;
  const postCount = (instance.prepare(`SELECT COUNT(*) AS n FROM posts`).get() as { n: number }).n;
  if (ftsCount === 0 && postCount > 0) {
    instance.exec(`
      INSERT INTO posts_fts(rowid, title, body)
      SELECT rowid, title, body FROM posts;
    `);
  }

  _db = instance;
  return _db;
}
