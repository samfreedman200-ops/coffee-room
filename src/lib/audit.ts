import { db } from "./db";
import { nanoid } from "nanoid";

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  note: string | null;
  created_at: number;
};

export function audit(params: {
  actorId: string | null;
  action: string;
  targetKind?: string | null;
  targetId?: string | null;
  note?: string | null;
}): void {
  db()
    .prepare(
      `INSERT INTO audit_log
       (id, actor_id, action, target_kind, target_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      nanoid(12),
      params.actorId,
      params.action,
      params.targetKind ?? null,
      params.targetId ?? null,
      params.note ?? null,
      Date.now(),
    );
}

export function listAuditLog(limit = 100): AuditEntry[] {
  return db()
    .prepare(`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as AuditEntry[];
}
