import { db } from "./db";

export type ContribStatus = "pending" | "approved" | "rejected";

export type ContributorRequest = {
  id: string;
  user_id: string;
  pitch: string;
  status: ContribStatus;
  decision_note: string | null;
  created_at: number;
  decided_at: number | null;
  decided_by: string | null;
};

export type ContributorRequestWithUser = ContributorRequest & {
  username: string;
  avatar_path: string | null;
};

export function insertContributorRequest(r: ContributorRequest): void {
  db()
    .prepare(
      `INSERT INTO contributor_requests
       (id, user_id, pitch, status, decision_note, created_at, decided_at, decided_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      r.id,
      r.user_id,
      r.pitch,
      r.status,
      r.decision_note,
      r.created_at,
      r.decided_at,
      r.decided_by,
    );
}

export function getLatestRequestForUser(
  userId: string,
): ContributorRequest | undefined {
  return db()
    .prepare(
      `SELECT * FROM contributor_requests
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId) as ContributorRequest | undefined;
}

export function getContributorRequest(
  id: string,
): ContributorRequest | undefined {
  return db()
    .prepare(`SELECT * FROM contributor_requests WHERE id = ?`)
    .get(id) as ContributorRequest | undefined;
}

export function listPendingContributorRequests(): ContributorRequestWithUser[] {
  return db()
    .prepare(
      `SELECT r.*, u.username, u.avatar_path
       FROM contributor_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`,
    )
    .all() as ContributorRequestWithUser[];
}

export function decideContributorRequest(
  id: string,
  status: "approved" | "rejected",
  decidedBy: string,
  note: string | null,
): void {
  db()
    .prepare(
      `UPDATE contributor_requests
       SET status = ?, decided_at = ?, decided_by = ?, decision_note = ?
       WHERE id = ?`,
    )
    .run(status, Date.now(), decidedBy, note, id);
}

export function countPendingRequests(): number {
  return (
    db()
      .prepare(
        `SELECT COUNT(*) AS n FROM contributor_requests WHERE status = 'pending'`,
      )
      .get() as { n: number }
  ).n;
}
