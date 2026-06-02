import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { recoverWithPhrase, startQuestionRecovery } from "./actions";

type Method = "phrase" | "questions";

export default async function RecoverPage(props: PageProps<"/recover">) {
  if (await currentUser()) redirect("/me");
  const sp = await props.searchParams;
  const method: Method =
    sp.method === "questions" ? "questions" : "phrase";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Recover your account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Two ways in. Use whichever you have.
        </p>
      </div>

      <div className="flex gap-2 border-b border-line">
        <Link
          href="/recover?method=phrase"
          className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            method === "phrase"
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Recovery phrase
        </Link>
        <Link
          href="/recover?method=questions"
          className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
            method === "questions"
              ? "border-accent text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Security questions
        </Link>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      {method === "phrase" ? (
        <form action={recoverWithPhrase} className="space-y-4">
          <label className="block">
            <span className="text-xs text-muted">username</span>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">recovery phrase</span>
            <input
              name="phrase"
              type="text"
              required
              autoComplete="off"
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
              className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none font-mono tracking-wider uppercase"
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
          <button
            type="submit"
            className="w-full text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
          >
            reset password
          </button>
        </form>
      ) : (
        <form action={startQuestionRecovery} className="space-y-4">
          <label className="block">
            <span className="text-xs text-muted">username</span>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none"
            />
          </label>
          <p className="text-xs text-muted">
            We&apos;ll show you the security questions you chose at signup.
            You need to answer at least 3 of 4 correctly.
          </p>
          <button
            type="submit"
            className="w-full text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
          >
            continue
          </button>
        </form>
      )}

      <p className="text-xs text-muted">
        Remembered after all?{" "}
        <Link href="/login" className="text-accent hover:underline">
          back to log in
        </Link>
      </p>
    </div>
  );
}
