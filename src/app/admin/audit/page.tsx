import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listAuditLog } from "@/lib/audit";
import { getUserById } from "@/lib/users";
import { relativeTime } from "@/lib/time";

export default async function AdminAuditPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/audit");
  if (user.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const entries = listAuditLog(200);

  return (
    <div className="space-y-8">
      <Link
        href="/admin"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← admin
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-tight">Audit log</h1>
        <p className="text-sm text-muted mt-1">
          Last {entries.length} admin and account actions.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          Nothing logged yet.
        </p>
      ) : (
        <ul className="divide-y divide-line text-xs font-mono">
          {entries.map((e) => {
            const actor = e.actor_id ? getUserById(e.actor_id) : null;
            return (
              <li key={e.id} className="py-2 flex gap-3 flex-wrap">
                <span className="text-muted shrink-0 w-24">
                  {relativeTime(e.created_at)}
                </span>
                <span className="text-muted shrink-0">
                  {actor ? `@${actor.username}` : "system"}
                </span>
                <span className="text-foreground">{e.action}</span>
                {e.target_kind ? (
                  <span className="text-muted">
                    {e.target_kind}:{(e.target_id ?? "").slice(0, 8)}
                  </span>
                ) : null}
                {e.note ? (
                  <span className="text-muted italic">— {e.note}</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
