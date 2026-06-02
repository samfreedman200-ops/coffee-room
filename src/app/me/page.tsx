import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { updateProfile, logout } from "./actions";

export default async function MePage(props: PageProps<"/me">) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/me");

  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar username={user.username} avatarPath={user.avatar_path} size={64} />
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            @{user.username}
          </h1>
          <p className="text-xs text-muted">
            {user.role}
            {" · "}
            <Link
              href={`/u/${user.username}`}
              className="hover:text-accent"
            >
              public profile
            </Link>
          </p>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}
      {notice === "password_changed" ? (
        <div className="text-sm text-green-600 dark:text-green-400">
          Password updated.
        </div>
      ) : null}

      <nav className="grid grid-cols-2 gap-3">
        <Link
          href="/submissions"
          className="rounded-md border border-line bg-card p-3 hover:border-accent transition-colors"
        >
          <div className="text-sm font-medium">Submissions</div>
          <div className="text-xs text-muted mt-0.5">
            {user.role === "contributor" || user.role === "admin"
              ? "Write a curated post"
              : "View your submission history"}
          </div>
        </Link>
        {user.role === "user" ? (
          <Link
            href="/contributor/request"
            className="rounded-md border border-line bg-card p-3 hover:border-accent transition-colors"
          >
            <div className="text-sm font-medium">Become a contributor</div>
            <div className="text-xs text-muted mt-0.5">
              Apply to write curated posts
            </div>
          </Link>
        ) : (
          <Link
            href="/dm"
            className="rounded-md border border-line bg-card p-3 hover:border-accent transition-colors"
          >
            <div className="text-sm font-medium">Messages</div>
            <div className="text-xs text-muted mt-0.5">DM inbox</div>
          </Link>
        )}
      </nav>

      <form
        action={updateProfile}
        encType="multipart/form-data"
        className="space-y-5 border-t border-line pt-6"
      >
        <h2 className="text-sm font-medium text-muted uppercase tracking-wider">
          edit profile
        </h2>

        <label className="block">
          <span className="text-xs text-muted">avatar (PNG/JPG/GIF/WebP, &lt;2MB)</span>
          <input
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-foreground hover:file:bg-accent hover:file:text-white"
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">bio (max 280 chars)</span>
          <textarea
            name="bio"
            defaultValue={user.bio ?? ""}
            maxLength={280}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm"
          />
        </label>

        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
        >
          save
        </button>
      </form>

      <div className="border-t border-line pt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/me/password" className="text-muted hover:text-accent">
          change password
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-muted hover:text-accent"
          >
            log out
          </button>
        </form>
        <Link
          href="/me/delete"
          className="text-muted hover:text-red-600 dark:hover:text-red-400 ml-auto"
        >
          delete account
        </Link>
      </div>
    </div>
  );
}
