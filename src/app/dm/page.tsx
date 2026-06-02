import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listThreadPreviews } from "@/lib/dms";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { startThread } from "./actions";

export default async function DmInboxPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/dm");

  const threads = listThreadPreviews(me.id);

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-accent-soft">
          ✦  inbox
        </span>
        <h1 className="font-serif text-3xl tracking-tight mt-2">Messages</h1>
        <p className="text-sm text-muted mt-1">
          Direct messages between accounts.
        </p>
      </div>

      <form
        action={startThread}
        className="surface-card p-4 flex items-center gap-2"
      >
        <input
          name="to_username"
          type="text"
          required
          placeholder="start a thread — username"
          autoComplete="off"
          className="flex-1 px-3 py-2 rounded-lg border border-line bg-background focus:border-accent focus:outline-none text-sm transition-colors"
        />
        <button type="submit" className="btn-accent px-4 py-2 text-sm">
          start
        </button>
      </form>

      {threads.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          No conversations yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dm/${t.other_username}`}
                className="block py-4 flex items-center gap-3 hover:bg-card -mx-2 px-2 rounded-md transition-colors"
              >
                <Avatar
                  username={t.other_username}
                  avatarPath={t.other_avatar_path}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      @{t.other_username}
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {relativeTime(t.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {t.last_sender_id === me.id ? "You: " : ""}
                    {t.last_body ?? "No messages yet."}
                  </p>
                </div>
                {t.unread_count > 0 ? (
                  <span className="text-xs bg-accent text-white rounded-full px-2 py-0.5">
                    {t.unread_count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
