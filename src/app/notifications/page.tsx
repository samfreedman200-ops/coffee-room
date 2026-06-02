import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  countAllNotifications,
  listNotifications,
  markAllRead,
  NOTIFICATIONS_PAGE_SIZE,
  parsePayload,
  type Notification,
} from "@/lib/notifications";
import { relativeTime } from "@/lib/time";

function describe(n: Notification): React.ReactNode {
  const p = parsePayload(n);
  switch (n.kind) {
    case "comment_on_post":
      return (
        <span>
          <strong>{String(p.actor ?? "someone")}</strong> commented on your post{" "}
          <Link
            href={`/post/${p.post_id}`}
            className="text-accent hover:underline"
          >
            (view)
          </Link>
        </span>
      );
    case "reply_to_comment":
      return (
        <span>
          <strong>{String(p.actor ?? "someone")}</strong> replied to your
          comment{" "}
          <Link
            href={`/post/${p.post_id}`}
            className="text-accent hover:underline"
          >
            (view)
          </Link>
        </span>
      );
    case "dm":
      return (
        <span>
          <strong>@{String(p.from_username)}</strong> messaged you:{" "}
          <span className="text-muted italic">
            “{String(p.preview ?? "")}”
          </span>{" "}
          <Link
            href={`/dm/${String(p.from_username)}`}
            className="text-accent hover:underline"
          >
            (open)
          </Link>
        </span>
      );
    case "submission_decided":
      return (
        <span>
          Your submission <em>{String(p.title)}</em> was{" "}
          <strong>{String(p.status)}</strong>.{" "}
          {p.post_id ? (
            <Link
              href={`/post/${p.post_id}`}
              className="text-accent hover:underline"
            >
              (published)
            </Link>
          ) : (
            <Link
              href="/submissions"
              className="text-accent hover:underline"
            >
              (view)
            </Link>
          )}
        </span>
      );
    case "contributor_decided":
      return (
        <span>
          Your contributor request was <strong>{String(p.status)}</strong>.{" "}
          <Link
            href="/contributor/request"
            className="text-accent hover:underline"
          >
            (view)
          </Link>
        </span>
      );
    case "new_follower":
      return (
        <span>
          <strong>@{String(p.from_username)}</strong> followed you.{" "}
          <Link
            href={`/u/${String(p.from_username)}`}
            className="text-accent hover:underline"
          >
            (profile)
          </Link>
        </span>
      );
    case "report_received":
      return (
        <span>
          Your content was <strong>{String(p.action ?? "actioned")}</strong> by
          a moderator. {p.note ? <em className="text-muted">— {String(p.note)}</em> : null}
        </span>
      );
  }
}

export default async function NotificationsPage(
  props: PageProps<"/notifications">,
) {
  const me = await currentUser();
  if (!me) redirect("/login?next=/notifications");

  const sp = await props.searchParams;
  const pageRaw = typeof sp.p === "string" ? parseInt(sp.p, 10) : 0;
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? pageRaw : 0;

  // Mark them read on load (only on the first page so paging back doesn't
  // re-mark stale ones).
  if (page === 0) markAllRead(me.id);

  const items = listNotifications(me.id, page);
  const total = countAllNotifications(me.id);
  const hasNext = (page + 1) * NOTIFICATIONS_PAGE_SIZE < total;
  const hasPrev = page > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Notifications</h1>
        <p className="text-sm text-muted mt-1">
          Replies, DMs, decisions, follows.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          Nothing here yet.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className="py-3 text-sm leading-relaxed">
                <div>{describe(n)}</div>
                <p className="text-xs text-muted mt-0.5">
                  {relativeTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>

          <nav className="flex items-center justify-between text-sm border-t border-line pt-4">
            {hasPrev ? (
              <Link
                href={
                  page - 1 === 0
                    ? "/notifications"
                    : `/notifications?p=${page - 1}`
                }
                className="text-accent hover:underline"
              >
                ← newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-muted">
              page {page + 1} · {total} total
            </span>
            {hasNext ? (
              <Link
                href={`/notifications?p=${page + 1}`}
                className="text-accent hover:underline"
              >
                older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </div>
  );
}
