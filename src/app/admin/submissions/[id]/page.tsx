import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSubmission } from "@/lib/submissions";
import { getUserById } from "@/lib/users";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { decideSubmissionAction } from "../../actions";

export default async function AdminSubmissionReviewPage(
  props: PageProps<"/admin/submissions/[id]">,
) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.role !== "admin") {
    return (
      <div className="py-20 text-center text-muted">
        <p>Admins only.</p>
      </div>
    );
  }

  const { id } = await props.params;
  const sub = getSubmission(id);
  if (!sub) notFound();

  const author = getUserById(sub.user_id);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/submissions"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← submission queue
      </Link>

      <div className="flex items-center gap-3">
        {author ? (
          <>
            <Avatar
              username={author.username}
              avatarPath={author.avatar_path}
              size={28}
            />
            <Link
              href={`/u/${author.username}`}
              className="text-sm font-medium hover:text-accent"
            >
              @{author.username}
            </Link>
          </>
        ) : (
          <span className="text-sm text-muted">unknown author</span>
        )}
        <span className="text-xs text-muted">
          · {relativeTime(sub.created_at)} · {sub.status}
        </span>
      </div>

      <h1 className="text-2xl font-medium tracking-tight">{sub.title}</h1>

      <article className="text-base leading-relaxed whitespace-pre-wrap">
        {sub.body}
      </article>

      {sub.status === "pending" ? (
        <form
          action={decideSubmissionAction}
          className="border-t border-line pt-6 space-y-3"
        >
          <input type="hidden" name="submission_id" value={sub.id} />
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            placeholder="Optional note. Especially useful for rejections."
            className="w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              name="decision"
              value="approved"
              className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
            >
              approve & publish
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="text-sm px-4 py-2 rounded-md border border-line hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
            >
              reject
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-line pt-6 space-y-2 text-sm">
          <p>
            Decided{" "}
            {sub.decided_at ? relativeTime(sub.decided_at) : "unknown"}.
          </p>
          {sub.decision_note ? (
            <p className="whitespace-pre-wrap text-muted">
              note: {sub.decision_note}
            </p>
          ) : null}
          {sub.published_post_id ? (
            <Link
              href={`/post/${sub.published_post_id}`}
              className="text-accent hover:underline"
            >
              view published post →
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
