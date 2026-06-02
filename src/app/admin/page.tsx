import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listUsers, type Role } from "@/lib/users";
import { countPendingRequests } from "@/lib/contributors";
import { countPendingSubmissions } from "@/lib/submissions";
import { countOpenReports } from "@/lib/reports";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { changeUserRole } from "./actions";

const ROLES: Role[] = ["user", "contributor", "admin"];

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const users = listUsers();
  const pendingRequests = countPendingRequests();
  const pendingSubs = countPendingSubmissions();
  const openReports = countOpenReports();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Admin</h1>
        <p className="text-sm text-muted mt-1">
          {users.length} {users.length === 1 ? "account" : "accounts"}
        </p>
      </div>

      <nav className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/admin/contributors"
          className="rounded-md border border-line bg-card p-4 hover:border-accent transition-colors"
        >
          <div className="text-sm font-medium">Contributor requests</div>
          <div className="text-xs text-muted mt-0.5">
            {pendingRequests} pending
          </div>
        </Link>
        <Link
          href="/admin/submissions"
          className="rounded-md border border-line bg-card p-4 hover:border-accent transition-colors"
        >
          <div className="text-sm font-medium">Submission queue</div>
          <div className="text-xs text-muted mt-0.5">
            {pendingSubs} pending
          </div>
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-md border border-line bg-card p-4 hover:border-accent transition-colors"
        >
          <div className="text-sm font-medium">Reports</div>
          <div className="text-xs text-muted mt-0.5">
            {openReports} open
          </div>
        </Link>
        <Link
          href="/admin/audit"
          className="rounded-md border border-line bg-card p-4 hover:border-accent transition-colors"
        >
          <div className="text-sm font-medium">Audit log</div>
          <div className="text-xs text-muted mt-0.5">
            actions trail
          </div>
        </Link>
      </nav>

      <section>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider mb-4">
          users
        </h2>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li
              key={u.id}
              className="py-4 flex items-center gap-4 first:pt-0"
            >
              <Avatar
                username={u.username}
                avatarPath={u.avatar_path}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/u/${u.username}`}
                  className="text-sm font-medium hover:text-accent"
                >
                  @{u.username}
                </Link>
                <p className="text-xs text-muted">
                  joined {relativeTime(u.created_at)}
                </p>
              </div>
              <form action={changeUserRole} className="flex items-center gap-2">
                <input type="hidden" name="user_id" value={u.id} />
                <select
                  name="role"
                  defaultValue={u.role}
                  disabled={u.id === user.id}
                  className="text-xs px-2 py-1 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={u.id === user.id}
                  className="text-xs px-2 py-1 rounded-md border border-line hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-foreground"
                >
                  save
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
