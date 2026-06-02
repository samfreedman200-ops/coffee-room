import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/app/auth-actions";
import { currentUser } from "@/lib/auth";
import {
  SECURITY_QUESTIONS,
  REQUIRED_QUESTIONS,
} from "@/lib/security-questions";

export default async function SignupPage(props: PageProps<"/signup">) {
  if (await currentUser()) redirect("/me");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/me";

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-accent-soft">
          ✦  open a tab
        </span>
        <h1 className="font-display text-5xl leading-[1.02] mt-3">
          Make yourself <span className="italic text-accent-soft">at home.</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          No email, no phone. Just a username and a password.
        </p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      ) : null}

      <form action={signup} className="space-y-6">
        <input type="hidden" name="next" value={next} />

        <section className="surface-card p-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted">
              username
            </span>
            <input
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]{3,24}"
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
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none transition-colors"
            />
            <span className="block mt-1.5 text-xs text-muted">
              8+ characters.
            </span>
          </label>
        </section>

        <section className="surface-card p-6 space-y-5">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent-soft">
              ✦  security questions
            </h2>
            <p className="mt-3 text-xs text-muted leading-relaxed">
              Pick {REQUIRED_QUESTIONS} different questions and answer each.
              These are a backup way to reset your password if you ever lose
              your recovery phrase. Pick questions whose answer is specific and
              unlikely to change. Capitalization and punctuation don&apos;t
              matter.
            </p>
          </div>

          {Array.from({ length: REQUIRED_QUESTIONS }).map((_, i) => (
            <div key={i} className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted">
                question {i + 1}
              </span>
              <select
                name={`q${i}_key`}
                required
                defaultValue=""
                className="w-full px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none text-sm transition-colors"
              >
                <option value="" disabled>
                  Choose a question…
                </option>
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q.key} value={q.key}>
                    {q.text}
                  </option>
                ))}
              </select>
              <input
                name={`q${i}_answer`}
                type="text"
                required
                minLength={2}
                maxLength={200}
                placeholder="Your answer"
                className="w-full px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none text-sm transition-colors"
                autoComplete="off"
              />
            </div>
          ))}
        </section>

        <button type="submit" className="btn-accent w-full py-2.5 text-sm">
          create account
        </button>
      </form>

      <p className="text-center text-xs text-muted">
        Already have one?{" "}
        <Link
          href="/login"
          className="text-accent hover:text-accent-soft transition-colors"
        >
          log in
        </Link>
      </p>
    </div>
  );
}
