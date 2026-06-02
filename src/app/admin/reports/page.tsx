import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listOpenReports } from "@/lib/reports";
import { getUserById } from "@/lib/users";
import { getComment, getPost } from "@/lib/posts";
import { relativeTime } from "@/lib/time";
import { decideReportAction } from "../actions";
import { adminRemoveComment, adminRemovePost } from "@/app/actions";

export default async function AdminReportsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin/reports");
  if (user.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const reports = listOpenReports();

  return (
    <div className="space-y-8">
      <Link
        href="/admin"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← admin
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-tight">Open reports</h1>
        <p className="text-sm text-muted mt-1">{reports.length} open</p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          Nothing in the queue.
        </p>
      ) : (
        <ul className="space-y-6">
          {reports.map((r) => {
            const reporter = getUserById(r.reporter_id);
            const target =
              r.target_kind === "post"
                ? getPost(r.target_id)
                : r.target_kind === "comment"
                  ? getComment(r.target_id)
                  : null;

            return (
              <li
                key={r.id}
                className="rounded-md border border-line bg-card p-4 space-y-3"
              >
                <div className="text-xs text-muted">
                  reporter: @{reporter?.username ?? "deleted"} ·{" "}
                  {relativeTime(r.created_at)}
                </div>
                <div className="text-sm">
                  <span className="text-muted">target: </span>
                  {r.target_kind === "post" ? (
                    target ? (
                      <Link
                        href={`/post/${r.target_id}`}
                        className="text-accent hover:underline"
                      >
                        post: {"title" in target ? target.title : ""}
                      </Link>
                    ) : (
                      <span className="text-muted">post (deleted)</span>
                    )
                  ) : r.target_kind === "comment" ? (
                    target ? (
                      <Link
                        href={`/post/${"post_id" in target ? target.post_id : ""}`}
                        className="text-accent hover:underline"
                      >
                        comment on a post
                      </Link>
                    ) : (
                      <span className="text-muted">comment (deleted)</span>
                    )
                  ) : (
                    r.target_kind
                  )}
                </div>
                <p className="text-sm leading-relaxed">
                  <span className="text-xs text-muted">reason: </span>
                  {r.reason}
                </p>
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <form action={decideReportAction}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="dismissed"
                      className="text-xs px-3 py-1 rounded-md border border-line hover:border-accent hover:text-accent"
                    >
                      dismiss
                    </button>
                  </form>
                  {r.target_kind === "post" && target ? (
                    <form action={adminRemovePost} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.target_id} />
                      <input
                        type="text"
                        name="note"
                        defaultValue={`Report: ${r.reason}`}
                        className="px-2 py-0.5 rounded border border-line bg-background text-xs flex-1"
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                      >
                        remove post
                      </button>
                    </form>
                  ) : r.target_kind === "comment" && target ? (
                    <form action={adminRemoveComment} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.target_id} />
                      <input
                        type="text"
                        name="note"
                        defaultValue={`Report: ${r.reason}`}
                        className="px-2 py-0.5 rounded border border-line bg-background text-xs flex-1"
                      />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                      >
                        remove comment
                      </button>
                    </form>
                  ) : null}
                  <form action={decideReportAction}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="actioned"
                      className="text-xs px-3 py-1 rounded-md border border-line hover:border-accent hover:text-accent"
                    >
                      mark actioned
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
