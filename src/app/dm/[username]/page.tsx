import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getUserByUsername } from "@/lib/users";
import {
  getOrCreateThread,
  listMessages,
  markThreadRead,
} from "@/lib/dms";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { Markdown } from "@/lib/markdown";
import { sendDm } from "../actions";

export default async function DmThreadPage(
  props: PageProps<"/dm/[username]">,
) {
  const me = await currentUser();
  const { username } = await props.params;
  if (!me) redirect(`/login?next=/dm/${encodeURIComponent(username)}`);

  const other = getUserByUsername(username);
  if (!other) notFound();
  if (other.id === me.id) redirect("/dm");

  const thread = getOrCreateThread(me.id, other.id);
  markThreadRead(thread.id, me.id);
  const messages = listMessages(thread.id);

  return (
    <div className="space-y-6">
      <Link
        href="/dm"
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← messages
      </Link>

      <div className="flex items-center gap-3 border-b border-line pb-4">
        <Avatar
          username={other.username}
          avatarPath={other.avatar_path}
          size={40}
        />
        <div>
          <Link
            href={`/u/${other.username}`}
            className="text-base font-medium hover:text-accent"
          >
            @{other.username}
          </Link>
          <p className="text-xs text-muted">{other.role}</p>
        </div>
      </div>

      {messages.length === 0 ? (
        <p className="text-sm text-muted py-12 text-center">
          Say hi.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const fromMe = m.sender_id === me.id;
            return (
              <li
                key={m.id}
                className={`flex ${fromMe ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%] space-y-1">
                  <div
                    className={
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed " +
                      (fromMe
                        ? "bg-accent text-white rounded-br-sm"
                        : "bg-card border border-line rounded-bl-sm")
                    }
                  >
                    <Markdown text={m.body} />
                  </div>
                  <p
                    className={
                      "text-[10px] text-muted " +
                      (fromMe ? "text-right" : "text-left")
                    }
                  >
                    {relativeTime(m.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={sendDm}
        className="border-t border-line pt-4 space-y-2"
      >
        <input type="hidden" name="to_username" value={other.username} />
        <textarea
          name="body"
          required
          maxLength={5000}
          rows={2}
          placeholder={`Message @${other.username} — Markdown supported`}
          className="w-full px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="text-sm px-4 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
          >
            send
          </button>
        </div>
      </form>
    </div>
  );
}
