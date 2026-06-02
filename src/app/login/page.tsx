import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/auth-actions";
import { currentUser } from "@/lib/auth";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await currentUser()) redirect("/me");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/me";

  return (
    <div className="max-w-sm mx-auto space-y-8">
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-accent-soft">
          ✦  welcome back
        </span>
        <h1 className="font-display text-5xl leading-[1.02] mt-3">
          Pull up a <span className="italic text-accent-soft">chair.</span>
        </h1>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      ) : null}

      <form action={login} className="surface-card p-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted">
            username
          </span>
          <input
            name="username"
            type="text"
            required
            autoComplete="username"
            className="mt-2 w-full px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted">
            password
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none transition-colors"
          />
        </label>
        <button type="submit" className="btn-accent w-full py-2.5 text-sm">
          log in
        </button>
      </form>

      <div className="text-center space-y-2 text-xs text-muted">
        <p>
          New here?{" "}
          <Link
            href="/signup"
            className="text-accent hover:text-accent-soft transition-colors"
          >
            create an account
          </Link>
        </p>
        <p>
          Forgot your password?{" "}
          <Link
            href="/recover"
            className="text-accent hover:text-accent-soft transition-colors"
          >
            recover access
          </Link>
        </p>
      </div>
    </div>
  );
}
