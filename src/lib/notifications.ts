import { db } from "./db";
import { nanoid } from "nanoid";

export type NotificationKind =
  | "comment_on_post"
  | "reply_to_comment"
  | "dm"
  | "submission_decided"
  | "contributor_decided"
  | "new_follower"
  | "report_received";

export type Notification = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  payload_json: string;
  read_at: number | null;
  created_at: number;
};

export type NotificationPayload = Record<string, unknown>;

export function createNotification(
  userId: string,
  kind: NotificationKind,
  payload: NotificationPayload,
): void {
  db()
    .prepare(
      `INSERT INTO notifications (id, user_id, kind, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(nanoid(12), userId, kind, JSON.stringify(payload), Date.now());
}

export const NOTIFICATIONS_PAGE_SIZE = 25;
const MAX_LIMIT = 100;

export function listNotifications(
  userId: string,
  page = 0,
  limit = NOTIFICATIONS_PAGE_SIZE,
): Notification[] {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
  const safePage = Math.max(0, Math.floor(page));
  return db()
    .prepare(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(userId, safeLimit, safePage * safeLimit) as Notification[];
}

export function countAllNotifications(userId: string): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?`)
      .get(userId) as { n: number }
  ).n;
}

export function countUnreadNotifications(userId: string): number {
  return (
    db()
      .prepare(
        `SELECT COUNT(*) AS n FROM notifications
         WHERE user_id = ? AND read_at IS NULL`,
      )
      .get(userId) as { n: number }
  ).n;
}

export function markAllRead(userId: string): void {
  db()
    .prepare(
      `UPDATE notifications SET read_at = ?
       WHERE user_id = ? AND read_at IS NULL`,
    )
    .run(Date.now(), userId);
}

export function parsePayload(n: Notification): NotificationPayload {
  try {
    return JSON.parse(n.payload_json);
  } catch {
    return {};
  }
}
