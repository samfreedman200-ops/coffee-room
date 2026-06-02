import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listPendingContributorRequests } from "@/lib/contributors";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { decideContributor } from "../actions";

export default async function AdminContributorsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/contributors");
  if (user.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const pending = listPendingContributorRequests();

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
          Contributor requests
        </h1>
        <p className="text-sm text-muted mt-1">
          {pending.length} pending
        </p>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          No pending requests.
        </p>
      ) : (
        <ul className="space-y-6">
          {pending.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-line bg-card p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  username={r.username}
                  avatarPath={r.avatar_path}
                  size={32}
                />
                <Link
                  href={`/u/${r.username}`}
                  className="text-sm font-medium hover:text-accent"
                >
                  @{r.username}
                </Link>
                <span className="text-xs text-muted">
                  · {relativeTime(r.created_at)}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap pl-11">
                {r.pitch}
              </p>
              <form
                action={decideContributor}
                className="pl-11 pt-2 border-t border-line space-y-3"
              >
                <input type="hidden" name="request_id" value={r.id} />
                <textarea
                  name="note"
                  rows={2}
                  maxLength={1000}
                  placeholder="Optional note to send back with the decision."
                  className="w-full px-3 py-2 rounded-md border border-line bg-background focus:border-accent focus:outline-none text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    name="decision"
                    value="approved"
                    className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
                  >
                    approve
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="rejected"
                    className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    reject
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
