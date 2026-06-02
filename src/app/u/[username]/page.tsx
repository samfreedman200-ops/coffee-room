import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserByUsername } from "@/lib/users";
import {
  countPostsByUser,
  countRepliesReceivedByUser,
  listPostsByUser,
} from "@/lib/posts";
import { relativeTime } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { countFollowers, countFollowing, isFollowing } from "@/lib/follows";
import { toggleFollow } from "@/app/follow/actions";

export default async function ProfilePage(props: PageProps<"/u/[username]">) {
  const { username } = await props.params;
  const user = getUserByUsername(username);
  if (!user) notFound();

  const me = await currentUser();
  const posts = listPostsByUser(user.id);
  const isSelf = me?.id === user.id;

  const followers = countFollowers(user.id);
  const following = countFollowing(user.id);
  const postCount = countPostsByUser(user.id);
  const replies = countRepliesReceivedByUser(user.id);
  const meFollows = me && !isSelf ? isFollowing(me.id, user.id) : false;

  return (
    <div className="space-y-12">
      <div className="surface-card p-6 sm:p-8 flex items-start gap-5">
        <Avatar
          username={user.username}
          avatarPath={user.avatar_path}
          size={80}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.02]">
              @{user.username}
            </h1>
            {user.role === "contributor" || user.role === "admin" ? (
              <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                {user.role}
              </span>
            ) : null}
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted mt-2">
            joined {relativeTime(user.created_at)}
          </p>
          {user.bio ? (
            <p className="mt-4 text-base leading-relaxed whitespace-pre-wrap text-foreground/85">
              {user.bio}
            </p>
          ) : null}

          <div className="mt-3 flex gap-4 text-xs text-muted">
            <span>
              <strong className="text-foreground">{postCount}</strong> posts
            </span>
            <span>
              <strong className="text-foreground">{replies}</strong> replies received
            </span>
            <span>
              <strong className="text-foreground">{followers}</strong> followers
            </span>
            <span>
              <strong className="text-foreground">{following}</strong> following
            </span>
          </div>

          {me && !isSelf ? (
            <div className="mt-5 flex gap-2">
              <Link
                href={`/dm/${user.username}`}
                className="btn-accent px-4 py-1.5 text-sm"
              >
                message
              </Link>
              <form action={toggleFollow}>
                <input type="hidden" name="username" value={user.username} />
                <input
                  type="hidden"
                  name="action"
                  value={meFollows ? "unfollow" : "follow"}
                />
                <button
                  type="submit"
                  className="btn-ghost px-4 py-1.5 text-sm"
                >
                  {meFollows ? "following" : "follow"}
                </button>
              </form>
            </div>
          ) : !me ? (
            <div className="mt-5 flex gap-2">
              <Link
                href={`/signup?next=${encodeURIComponent(`/dm/${user.username}`)}`}
                className="btn-accent px-4 py-1.5 text-sm"
                title="Sign up to message"
              >
                message
              </Link>
              <Link
                href={`/signup?next=${encodeURIComponent(`/u/${user.username}`)}`}
                className="btn-ghost px-4 py-1.5 text-sm"
                title="Sign up to follow"
              >
                follow
              </Link>
            </div>
          ) : null}
          {isSelf && me?.role === "user" ? (
            <div className="mt-4">
              <Link
                href="/contributor/request"
                className="text-xs text-accent hover:underline"
              >
                become a contributor →
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted shrink-0">
            posts
          </span>
          <span className="h-px flex-1 bg-line"></span>
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">No public posts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((p) => (
              <li key={p.id} className="py-4 first:pt-0">
                <Link href={`/post/${p.id}`} className="group block">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium group-hover:text-accent transition-colors">
                      {p.title}
                    </h3>
                    {p.via_submission_id ? (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                        curated
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{p.body}</p>
                  <div className="mt-1 text-xs text-muted flex gap-3">
                    <span>{relativeTime(p.created_at)}</span>
                    <span>·</span>
                    <span>
                      {p.comment_count}{" "}
                      {p.comment_count === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
