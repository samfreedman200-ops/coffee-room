import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSubmission } from "@/lib/submissions";
import { relativeTime } from "@/lib/time";

export default async function SubmissionDetailPage(
  props: PageProps<"/submissions/[id]">,
) {
  const me = await currentUser();
  if (!me) redirect("/login");

  const { id } = await props.params;
  const sub = getSubmission(id);
  if (!sub) notFound();

  // Only the submitter (or admin) can view their own submission.
  if (sub.user_id !== me.id && me.role !== "admin") notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/submissions"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← back to your submissions
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">{sub.title}</h1>
        <span
          className={
            "text-xs uppercase tracking-wider shrink-0 " +
            (sub.status === "approved"
              ? "text-green-600 dark:text-green-400"
              : sub.status === "rejected"
                ? "text-red-600 dark:text-red-400"
                : "text-muted")
          }
        >
          {sub.status}
        </span>
      </div>

      <p className="text-xs text-muted">
        submitted {relativeTime(sub.created_at)}
        {sub.decided_at
          ? ` · decided ${relativeTime(sub.decided_at)}`
          : null}
      </p>

      {sub.decision_note ? (
        <div className="rounded-md border border-line bg-card p-4">
          <p className="text-xs text-muted mb-1">admin note</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {sub.decision_note}
          </p>
        </div>
      ) : null}

      {sub.status === "approved" && sub.published_post_id ? (
        <Link
          href={`/post/${sub.published_post_id}`}
          className="text-sm text-accent hover:underline"
        >
          view the published post →
        </Link>
      ) : null}

      <article className="border-t border-line pt-6 text-base leading-relaxed whitespace-pre-wrap">
        {sub.body}
      </article>
    </div>
  );
}
