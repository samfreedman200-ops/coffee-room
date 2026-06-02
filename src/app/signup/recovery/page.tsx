import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RecoveryPage(
  props: PageProps<"/signup/recovery">,
) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/me";

  const jar = await cookies();
  const phrase = jar.get("cr_pending_recovery")?.value;
  if (!phrase) redirect(next);

  // Clear immediately after reading so it's only shown once.
  jar.delete("cr_pending_recovery");

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Save this recovery phrase
        </h1>
        <p className="mt-2 text-sm text-muted">
          This is the only way to recover your account if you forget your
          password. We&apos;ll only show it once. Write it down, screenshot it,
          or save it in a password manager.
        </p>
      </div>

      <div className="rounded-md border border-line bg-card p-6 text-center">
        <p className="font-mono text-lg tracking-widest break-all select-all">
          {phrase}
        </p>
      </div>

      <div className="space-y-2 text-sm text-muted">
        <p>· Anyone with this phrase can reset your password.</p>
        <p>· Keep it somewhere safe and private.</p>
        <p>· We can&apos;t recover it for you if you lose it.</p>
      </div>

      <Link
        href={next}
        className="block text-center text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
      >
        I&apos;ve saved it — continue
      </Link>
    </div>
  );
}
