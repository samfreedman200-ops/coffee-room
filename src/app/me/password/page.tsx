import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { changePassword } from "@/app/me/actions";

export default async function ChangePasswordPage(
  props: PageProps<"/me/password">,
) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/me/password");
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
        <h1 className="text-2xl font-medium tracking-tight mt-2">
          Change password
        </h1>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <form action={changePassword} className="space-y-4">
        <label className="block">
          <span className="text-xs text-muted">current password</span>
          <input
            name="current_password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">new password</span>
          <input
            name="new_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">confirm new password</span>
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
        >
          save new password
        </button>
      </form>
    </div>
  );
}
