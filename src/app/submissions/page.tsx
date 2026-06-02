import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listSubmissionsByUser } from "@/lib/submissions";
import { relativeTime } from "@/lib/time";

export default async function SubmissionsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/submissions");

  const subs = listSubmissionsByUser(user.id);
  const canSubmit = user.role === "contributor" || user.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Your submissions
          </h1>
          <p className="text-sm text-muted mt-1">
            {canSubmit
              ? "Drafts you've sent in for review."
              : "You'll be able to submit posts once an admin approves your contributor request."}
          </p>
        </div>
        {canSubmit ? (
          <Link
            href="/submissions/new"
            className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
          >
            new submission
          </Link>
        ) : (
          <Link
            href="/contributor/request"
            className="text-sm text-accent hover:underline"
          >
            become a contributor →
          </Link>
        )}
      </div>

      {subs.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          Nothing submitted yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {subs.map((s) => (
            <li key={s.id} className="py-4 first:pt-0">
              <Link href={`/submissions/${s.id}`} className="group block">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-medium group-hover:text-accent transition-colors truncate">
                    {s.title}
                  </h3>
                  <span
                    className={
                      "text-xs uppercase tracking-wider shrink-0 " +
                      (s.status === "approved"
                        ? "text-green-600 dark:text-green-400"
                        : s.status === "rejected"
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted")
                    }
                  >
                    {s.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {relativeTime(s.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
