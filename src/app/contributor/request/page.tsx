import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getLatestRequestForUser } from "@/lib/contributors";
import { relativeTime } from "@/lib/time";
import { submitContributorRequest } from "@/app/contributor/actions";

const ERROR_MESSAGES: Record<string, string> = {
  already_contributor: "You're already a contributor (or admin).",
  pending: "You already have a pending request — wait for an admin to review it.",
};

export default async function ContributorRequestPage(
  props: PageProps<"/contributor/request">,
) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/contributor/request");

  const sp = await props.searchParams;
  const rawError = typeof sp.error === "string" ? sp.error : undefined;
  const error = rawError ? ERROR_MESSAGES[rawError] ?? rawError : undefined;
  const ok = sp.ok === "1";

  const existing = getLatestRequestForUser(user.id);
  const isContributor = user.role === "contributor" || user.role === "admin";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Become a contributor
        </h1>
        <p className="mt-1 text-sm text-muted">
          Contributors can submit posts for the curated feed. An admin reviews
          each one.
        </p>
      </div>

      {isContributor ? (
        <div className="rounded-md border border-line bg-card p-4 text-sm">
          You&apos;re already a{" "}
          <span className="font-medium">{user.role}</span>.{" "}
          <Link href="/submissions/new" className="text-accent hover:underline">
            Submit something →
          </Link>
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-md border border-line bg-card p-4 text-sm">
          Request submitted. We&apos;ll review it.
        </div>
      ) : null}
      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      {existing ? (
        <section className="rounded-md border border-line bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>your most recent request</span>
            <span>{relativeTime(existing.created_at)}</span>
          </div>
          <div className="text-sm">
            Status:{" "}
            <span
              className={
                existing.status === "approved"
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : existing.status === "rejected"
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-foreground font-medium"
              }
            >
              {existing.status}
            </span>
          </div>
          {existing.decision_note ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap pt-1 border-t border-line mt-2">
              <span className="text-xs text-muted">admin note: </span>
              {existing.decision_note}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted">
            {existing.pitch}
          </p>
        </section>
      ) : null}

      {!isContributor &&
      (!existing || existing.status === "rejected") ? (
        <form action={submitContributorRequest} className="space-y-4">
          <label className="block">
            <span className="text-xs text-muted">
              your pitch (50–2000 chars)
            </span>
            <textarea
              name="pitch"
              required
              minLength={50}
              maxLength={2000}
              rows={8}
              placeholder="What would you write about? Why should we curate it?"
              className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm leading-relaxed resize-none"
            />
          </label>
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
          >
            submit request
          </button>
        </form>
      ) : null}
    </div>
  );
}
