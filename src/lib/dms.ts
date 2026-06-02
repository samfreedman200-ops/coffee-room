import { db } from "./db";

export type DmThread = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: number;
  last_message_at: number;
};

export type DmMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: number;
  read_at: number | null;
};

export type ThreadPreview = {
  id: string;
  other_user_id: string;
  other_username: string;
  other_avatar_path: string | null;
  last_message_at: number;
  last_body: string | null;
  last_sender_id: string | null;
  unread_count: number;
};

/** Canonical user ordering so each pair has one row. */
function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function getOrCreateThread(
  selfId: string,
  otherId: string,
): DmThread {
  if (selfId === otherId) throw new Error("Cannot DM yourself.");
  const [ua, ub] = pair(selfId, otherId);
  const existing = db()
    .prepare(`SELECT * FROM dm_threads WHERE user_a = ? AND user_b = ?`)
    .get(ua, ub) as DmThread | undefined;
  if (existing) return existing;

  const now = Date.now();
  const id = `t_${ua.slice(0, 6)}_${ub.slice(0, 6)}_${now.toString(36)}`;
  db()
    .prepare(
      `INSERT INTO dm_threads (id, user_a, user_b, created_at, last_message_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, ua, ub, now, now);
  return {
    id,
    user_a: ua,
    user_b: ub,
    created_at: now,
    last_message_at: now,
  };
}

export function getThreadById(id: string): DmThread | undefined {
  return db()
    .prepare(`SELECT * FROM dm_threads WHERE id = ?`)
    .get(id) as DmThread | undefined;
}

export function insertMessage(m: DmMessage): void {
  const tx = db().transaction((msg: DmMessage) => {
    db()
      .prepare(
        `INSERT INTO dm_messages (id, thread_id, sender_id, body, created_at, read_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(msg.id, msg.thread_id, msg.sender_id, msg.body, msg.created_at, msg.read_at);
    db()
      .prepare(`UPDATE dm_threads SET last_message_at = ? WHERE id = ?`)
      .run(msg.created_at, msg.thread_id);
  });
  tx(m);
}

export function listMessages(threadId: string): DmMessage[] {
  return db()
    .prepare(
      `SELECT * FROM dm_messages
       WHERE thread_id = ?
       ORDER BY created_at ASC`,
    )
    .all(threadId) as DmMessage[];
}

export function markThreadRead(threadId: string, userId: string): void {
  db()
    .prepare(
      `UPDATE dm_messages
       SET read_at = ?
       WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
    )
    .run(Date.now(), threadId, userId);
}

export function listThreadPreviews(userId: string): ThreadPreview[] {
  return db()
    .prepare(
      `SELECT
         t.id AS id,
         CASE WHEN t.user_a = ? THEN t.user_b ELSE t.user_a END AS other_user_id,
         u.username AS other_username,
         u.avatar_path AS other_avatar_path,
         t.last_message_at AS last_message_at,
         (SELECT body FROM dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_body,
         (SELECT sender_id FROM dm_messages m WHERE m.thread_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS last_sender_id,
         (SELECT COUNT(*) FROM dm_messages m
            WHERE m.thread_id = t.id
              AND m.sender_id != ?
              AND m.read_at IS NULL) AS unread_count
       FROM dm_threads t
       JOIN users u
         ON u.id = (CASE WHEN t.user_a = ? THEN t.user_b ELSE t.user_a END)
       WHERE t.user_a = ? OR t.user_b = ?
       ORDER BY t.last_message_at DESC`,
    )
    .all(userId, userId, userId, userId, userId) as ThreadPreview[];
}

export function countUnreadAcrossThreads(userId: string): number {
  return (
    db()
      .prepare(
        `SELECT COUNT(*) AS n
         FROM dm_messages m
         JOIN dm_threads t ON t.id = m.thread_id
         WHERE m.sender_id != ?
           AND m.read_at IS NULL
           AND (t.user_a = ? OR t.user_b = ?)`,
      )
      .get(userId, userId, userId) as { n: number }
  ).n;
}
