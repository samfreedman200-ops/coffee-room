import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { createSubmission } from "../actions";

export default async function NewSubmissionPage(
  props: PageProps<"/submissions/new">,
) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/submissions/new");
  if (user.role !== "contributor" && user.role !== "admin") {
    redirect("/contributor/request");
  }

  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">New submission</h1>
        <p className="text-sm text-muted mt-1">
          This goes to the admin queue. It won&apos;t appear publicly until
          approved.
        </p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <form action={createSubmission} className="space-y-6">
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Title"
          className="w-full bg-transparent text-2xl font-medium tracking-tight placeholder:text-muted/60 focus:outline-none"
          autoFocus
        />
        <textarea
          name="body"
          required
          minLength={100}
          maxLength={50000}
          rows={20}
          placeholder="Write the piece. 100 characters minimum."
          className="w-full bg-transparent text-base leading-relaxed placeholder:text-muted/60 focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between pt-4 border-t border-line">
          <p className="text-xs text-muted">
            You can revise and resubmit if it&apos;s rejected.
          </p>
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
          >
            submit for review
          </button>
        </div>
      </form>
    </div>
  );
}
