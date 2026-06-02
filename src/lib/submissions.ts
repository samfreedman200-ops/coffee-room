import { db } from "./db";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  status: SubmissionStatus;
  decision_note: string | null;
  published_post_id: string | null;
  created_at: number;
  decided_at: number | null;
  decided_by: string | null;
};

export type SubmissionWithUser = Submission & {
  username: string;
  avatar_path: string | null;
};

export function insertSubmission(s: Submission): void {
  db()
    .prepare(
      `INSERT INTO submissions
       (id, user_id, title, body, status, decision_note, published_post_id,
        created_at, decided_at, decided_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      s.id,
      s.user_id,
      s.title,
      s.body,
      s.status,
      s.decision_note,
      s.published_post_id,
      s.created_at,
      s.decided_at,
      s.decided_by,
    );
}

export function getSubmission(id: string): Submission | undefined {
  return db()
    .prepare(`SELECT * FROM submissions WHERE id = ?`)
    .get(id) as Submission | undefined;
}

export function listSubmissionsByUser(userId: string): Submission[] {
  return db()
    .prepare(
      `SELECT * FROM submissions WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .all(userId) as Submission[];
}

export function listPendingSubmissions(): SubmissionWithUser[] {
  return db()
    .prepare(
      `SELECT s.*, u.username, u.avatar_path
       FROM submissions s
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'pending'
       ORDER BY s.created_at ASC`,
    )
    .all() as SubmissionWithUser[];
}

export function decideSubmission(
  id: string,
  status: "approved" | "rejected",
  decidedBy: string,
  note: string | null,
  publishedPostId: string | null,
): void {
  db()
    .prepare(
      `UPDATE submissions
       SET status = ?, decided_at = ?, decided_by = ?,
           decision_note = ?, published_post_id = ?
       WHERE id = ?`,
    )
    .run(status, Date.now(), decidedBy, note, publishedPostId, id);
}

export function countPendingSubmissions(): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'`)
      .get() as { n: number }
  ).n;
}
