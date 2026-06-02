import { db } from "./db";

export type ReportKind = "post" | "comment" | "user" | "dm";
export type ReportStatus = "open" | "dismissed" | "actioned";

export type Report = {
  id: string;
  reporter_id: string;
  target_kind: ReportKind;
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: number;
  decided_at: number | null;
  decided_by: string | null;
};

export function insertReport(r: Report): void {
  db()
    .prepare(
      `INSERT INTO reports
       (id, reporter_id, target_kind, target_id, reason, status, created_at, decided_at, decided_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      r.id,
      r.reporter_id,
      r.target_kind,
      r.target_id,
      r.reason,
      r.status,
      r.created_at,
      r.decided_at,
      r.decided_by,
    );
}

export function listOpenReports(): Report[] {
  return db()
    .prepare(`SELECT * FROM reports WHERE status = 'open' ORDER BY created_at ASC`)
    .all() as Report[];
}

export function countOpenReports(): number {
  return (
    db()
      .prepare(`SELECT COUNT(*) AS n FROM reports WHERE status = 'open'`)
      .get() as { n: number }
  ).n;
}

export function decideReport(
  id: string,
  status: "dismissed" | "actioned",
  decidedBy: string,
): void {
  db()
    .prepare(
      `UPDATE reports SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?`,
    )
    .run(status, Date.now(), decidedBy, id);
}
