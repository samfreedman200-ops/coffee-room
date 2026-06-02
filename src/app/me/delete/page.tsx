import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { deleteAccount } from "@/app/me/actions";

export default async function DeleteAccountPage(
  props: PageProps<"/me/delete">,
) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/me/delete");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <div>
        <Link
          href="/me"
          className="text-xs text-muted hover:text-accent inline-block"
        >
          ← profile
        </Link>
        <h1 className="text-2xl font-medium tracking-tight mt-2 text-red-600 dark:text-red-400">
          Delete account
        </h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Removes your account, sessions, DMs, security questions, follows,
          and notifications. Posts and comments you wrote stay up but become
          anonymous (your username is detached). This cannot be undone.
        </p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <form action={deleteAccount} className="space-y-4">
        <label className="block">
          <span className="text-xs text-muted">password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">
            type:{" "}
            <code className="font-mono text-foreground">
              delete @{user.username}
            </code>
          </span>
          <input
            name="confirm"
            type="text"
            required
            autoComplete="off"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          permanently delete my account
        </button>
      </form>
    </div>
  );
}
