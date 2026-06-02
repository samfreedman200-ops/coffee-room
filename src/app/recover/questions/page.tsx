import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getUserByUsername } from "@/lib/users";
import {
  getSecurityQuestions,
  MIN_CORRECT_TO_RECOVER,
  REQUIRED_QUESTIONS,
  SECURITY_QUESTION_MAP,
} from "@/lib/security-questions";
import { recoverWithQuestions } from "../actions";

export default async function RecoverQuestionsPage(
  props: PageProps<"/recover/questions">,
) {
  if (await currentUser()) redirect("/me");

  const sp = await props.searchParams;
  const username = typeof sp.username === "string" ? sp.username : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  if (!username) redirect("/recover?method=questions");

  const user = getUserByUsername(username);
  if (!user) {
    redirect(
      `/recover?method=questions&error=${encodeURIComponent("No account with that username.")}`,
    );
  }

  const stored = getSecurityQuestions(user.id);
  if (stored.length === 0) {
    redirect(
      `/recover?method=questions&error=${encodeURIComponent("This account has no security questions. Use the recovery phrase instead.")}`,
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Answer your security questions
        </h1>
        <p className="mt-1 text-sm text-muted">
          For{" "}
          <span className="font-medium text-foreground">@{user.username}</span>.
          You need to answer at least {MIN_CORRECT_TO_RECOVER} of{" "}
          {REQUIRED_QUESTIONS} correctly.
        </p>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}

      <form action={recoverWithQuestions} className="space-y-6">
        <input type="hidden" name="username" value={username} />

        {stored.map((q, i) => (
          <div key={q.position} className="space-y-2">
            <label className="block">
              <span className="text-xs text-muted">
                {SECURITY_QUESTION_MAP.get(q.question_key) ?? q.question_key}
              </span>
              <input
                name={`a${i}`}
                type="text"
                required
                minLength={2}
                maxLength={200}
                autoComplete="off"
                className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm"
              />
            </label>
          </div>
        ))}

        <label className="block border-t border-line pt-4">
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

      <p className="text-xs text-muted">
        <Link href="/recover" className="text-accent hover:underline">
          ← back
        </Link>
      </p>
    </div>
  );
}
