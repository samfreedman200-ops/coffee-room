import { db } from "./db";

export function follow(followerId: string, followeeId: string): boolean {
  if (followerId === followeeId) return false;
  const r = db()
    .prepare(
      `INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(followerId, followeeId, Date.now());
  return r.changes > 0;
}

export function unfollow(followerId: string, followeeId: string): void {
  db()
    .prepare(`DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`)
    .run(followerId, followeeId);
}

export function isFollowing(followerId: string, followeeId: string): boolean {
  return !!db()
    .prepare(
      `SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?`,
    )
    .get(followerId, followeeId);
}

export function countFollowers(userId: string): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM follows WHERE followee_id = ?`)
      .get(userId) as { n: number }
  ).n;
}

export function countFollowing(userId: string): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?`)
      .get(userId) as { n: number }
  ).n;
}

export function listFollowingIds(userId: string): string[] {
  return (
    db()
      .prepare(`SELECT followee_id FROM follows WHERE follower_id = ?`)
      .all(userId) as Array<{ followee_id: string }>
  ).map((r) => r.followee_id);
}
