import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { listFollowingIds } from "@/lib/follows";
import { listPostsByUserIds } from "@/lib/posts";
import { relativeTime } from "@/lib/time";

export default async function FollowingFeedPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/feed");

  const ids = listFollowingIds(me.id);
  const posts = listPostsByUserIds(ids);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Following</h1>
        <p className="text-sm text-muted mt-1">
          Latest posts from accounts you follow.
        </p>
      </div>

      {ids.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          You&apos;re not following anyone yet. Find someone on a post and tap
          their @handle.
        </p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center border-t border-line">
          No posts yet from accounts you follow.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {posts.map((p) => (
            <li key={p.id} className="py-6 first:pt-0">
              <Link href={`/post/${p.id}`} className="group block">
                <h2 className="text-base font-medium group-hover:text-accent transition-colors">
                  {p.title}
                </h2>
                <p className="mt-1 text-sm text-muted line-clamp-2">{p.body}</p>
                <div className="mt-2 text-xs text-muted flex gap-3">
                  <span>{p.handle}</span>
                  <span>·</span>
                  <span>{relativeTime(p.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
