import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listPendingSubmissions } from "@/lib/submissions";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";

export default async function AdminSubmissionsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/submissions");
  if (user.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const pending = listPendingSubmissions();

  return (
    <div className="space-y-8">
      <Link
        href="/admin"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← admin
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Submission queue
        </h1>
        <p className="text-sm text-muted mt-1">
          {pending.length} pending
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          No pending submissions.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {pending.map((s) => (
            <li key={s.id} className="py-4 first:pt-0">
              <Link href={`/admin/submissions/${s.id}`} className="group block">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar
                    username={s.username}
                    avatarPath={s.avatar_path}
                    size={24}
                  />
                  <span className="text-xs text-muted">
                    @{s.username} · {relativeTime(s.created_at)}
                  </span>
                </div>
                <h3 className="text-base font-medium group-hover:text-accent transition-colors">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-muted line-clamp-2">
                  {s.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
