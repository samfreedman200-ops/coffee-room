import { db } from "./db";

export type PostStatus = "published" | "draft" | "removed";
export type CommentStatus = "published" | "removed";

export type Post = {
  id: string;
  title: string;
  body: string;
  handle: string;
  user_id: string | null;
  via_submission_id: string | null;
  status: PostStatus;
  edited_at: number | null;
  removed_by: string | null;
  image_path: string | null;
  created_at: number;
};

export type Comment = {
  id: string;
  post_id: string;
  body: string;
  handle: string;
  user_id: string | null;
  parent_id: string | null;
  status: CommentStatus;
  edited_at: number | null;
  removed_by: string | null;
  created_at: number;
};

export type PostWithCount = Post & { comment_count: number };

const PAGE_SIZE = 20;

export function listPosts(page = 0, limit = PAGE_SIZE): PostWithCount[] {
  return db()
    .prepare(
      `SELECT p.*, (
         SELECT COUNT(*) FROM comments c
         WHERE c.post_id = p.id AND c.status = 'published'
       ) AS comment_count
       FROM posts p
       WHERE p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, page * limit) as PostWithCount[];
}

export function countPublishedPosts(): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM posts WHERE status = 'published'`)
      .get() as { n: number }
  ).n;
}

export function listPostsByUser(userId: string): PostWithCount[] {
  return db()
    .prepare(
      `SELECT p.*, (
         SELECT COUNT(*) FROM comments c
         WHERE c.post_id = p.id AND c.status = 'published'
       ) AS comment_count
       FROM posts p
       WHERE p.user_id = ? AND p.status = 'published'
       ORDER BY p.created_at DESC`,
    )
    .all(userId) as PostWithCount[];
}

export function listPostsByUserIds(userIds: string[]): PostWithCount[] {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(",");
  return db()
    .prepare(
      `SELECT p.*, (
         SELECT COUNT(*) FROM comments c
         WHERE c.post_id = p.id AND c.status = 'published'
       ) AS comment_count
       FROM posts p
       WHERE p.user_id IN (${placeholders}) AND p.status = 'published'
       ORDER BY p.created_at DESC`,
    )
    .all(...userIds) as PostWithCount[];
}

export function getPost(id: string): Post | undefined {
  return db()
    .prepare(`SELECT * FROM posts WHERE id = ?`)
    .get(id) as Post | undefined;
}

export function listComments(postId: string): Comment[] {
  return db()
    .prepare(
      `SELECT * FROM comments
       WHERE post_id = ?
       ORDER BY created_at ASC`,
    )
    .all(postId) as Comment[];
}

export function getComment(id: string): Comment | undefined {
  return db()
    .prepare(`SELECT * FROM comments WHERE id = ?`)
    .get(id) as Comment | undefined;
}

export function insertPost(p: Post): void {
  db()
    .prepare(
      `INSERT INTO posts
       (id, title, body, handle, user_id, via_submission_id, status, edited_at, removed_by, image_path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.id,
      p.title,
      p.body,
      p.handle,
      p.user_id,
      p.via_submission_id,
      p.status,
      p.edited_at,
      p.removed_by,
      p.image_path,
      p.created_at,
    );
}

export function insertComment(c: Comment): void {
  db()
    .prepare(
      `INSERT INTO comments
       (id, post_id, body, handle, user_id, parent_id, status, edited_at, removed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      c.id,
      c.post_id,
      c.body,
      c.handle,
      c.user_id,
      c.parent_id,
      c.status,
      c.edited_at,
      c.removed_by,
      c.created_at,
    );
}

export function updatePostBody(id: string, title: string, body: string): void {
  db()
    .prepare(
      `UPDATE posts SET title = ?, body = ?, edited_at = ? WHERE id = ?`,
    )
    .run(title, body, Date.now(), id);
}

export function updateCommentBody(id: string, body: string): void {
  db()
    .prepare(`UPDATE comments SET body = ?, edited_at = ? WHERE id = ?`)
    .run(body, Date.now(), id);
}

export function setPostStatus(
  id: string,
  status: PostStatus,
  removedBy: string | null,
): void {
  db()
    .prepare(`UPDATE posts SET status = ?, removed_by = ? WHERE id = ?`)
    .run(status, removedBy, id);
}

export function setCommentStatus(
  id: string,
  status: CommentStatus,
  removedBy: string | null,
): void {
  db()
    .prepare(`UPDATE comments SET status = ?, removed_by = ? WHERE id = ?`)
    .run(status, removedBy, id);
}

export function deletePost(id: string): void {
  db().prepare(`DELETE FROM posts WHERE id = ?`).run(id);
}

export function deleteComment(id: string): void {
  db().prepare(`DELETE FROM comments WHERE id = ?`).run(id);
}

export function countPostsByUser(userId: string): number {
  return (
    db()
      .prepare(
        `SELECT COUNT(*) AS n FROM posts WHERE user_id = ? AND status = 'published'`,
      )
      .get(userId) as { n: number }
  ).n;
}

export function countRepliesReceivedByUser(userId: string): number {
  return (
    db()
      .prepare(
        `SELECT COUNT(*) AS n FROM comments c
         JOIN posts p ON p.id = c.post_id
         WHERE p.user_id = ? AND c.status = 'published'`,
      )
      .get(userId) as { n: number }
  ).n;
}

export function searchPosts(
  query: string,
  limit = 30,
): PostWithCount[] {
  if (!query.trim()) return [];
  // Use FTS5 MATCH for ranked results; sanitize naively.
  const sanitized = query
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `${t}*`)
    .join(" ");
  if (!sanitized) return [];
  return db()
    .prepare(
      `SELECT p.*, (
         SELECT COUNT(*) FROM comments c
         WHERE c.post_id = p.id AND c.status = 'published'
       ) AS comment_count
       FROM posts_fts f
       JOIN posts p ON p.rowid = f.rowid
       WHERE posts_fts MATCH ? AND p.status = 'published'
       ORDER BY rank
       LIMIT ?`,
    )
    .all(sanitized, limit) as PostWithCount[];
}
