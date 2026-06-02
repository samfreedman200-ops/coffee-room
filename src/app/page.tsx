import Link from "next/link";
import { countPublishedPosts, listPosts, type PostWithCount } from "@/lib/posts";
import { relativeTime } from "@/lib/time";
import { getUserById } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import { currentUser } from "@/lib/auth";
import { reactionsForTargets } from "@/lib/reactions";
import { isFollowing } from "@/lib/follows";
import { Reactions } from "@/components/Reactions";
import { toggleFollow } from "@/app/follow/actions";
import { readAnonId } from "@/lib/anon";

const PAGE_SIZE = 12;

function excerpt(body: string, max = 240): string {
  // Strip markdown image syntax + extra whitespace, then cap length.
  const cleaned = body
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > max ? cleaned.slice(0, max).trimEnd() + "…" : cleaned;
}

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const pageRaw = typeof sp.p === "string" ? parseInt(sp.p, 10) : 0;
  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? pageRaw : 0;

  const posts = listPosts(page, PAGE_SIZE);
  const total = countPublishedPosts();
  const hasNext = (page + 1) * PAGE_SIZE < total;
  const hasPrev = page > 0;

  const me = await currentUser();
  const anonId = me ? null : await readAnonId();

  // Pre-batch reactions for everything on the page.
  const reactionMap = reactionsForTargets(
    posts.map((p) => ({ kind: "post" as const, id: p.id })),
    me?.id ?? null,
    anonId,
  );

  // Pre-resolve author lookups + follow state.
  const authors = new Map<
    string,
    { username: string; avatar_path: string | null; isMine: boolean; iFollow: boolean }
  >();
  for (const p of posts) {
    if (p.user_id && !authors.has(p.user_id)) {
      const u = getUserById(p.user_id);
      if (u) {
        authors.set(p.user_id, {
          username: u.username,
          avatar_path: u.avatar_path,
          isMine: me?.id === u.id,
          iFollow: me ? isFollowing(me.id, u.id) : false,
        });
      }
    }
  }

  if (posts.length === 0 && page === 0) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="font-serif text-2xl text-foreground/80">
          The room is empty.
        </p>
        <p className="text-sm text-muted">
          Nobody&apos;s pulled up a chair yet.
        </p>
        <Link href="/new" className="btn-accent inline-block px-5 py-2 text-sm">
          be the first to write
        </Link>
      </div>
    );
  }

  const [hero, ...rest] = posts;

  return (
    <div className="space-y-14">
      {page === 0 ? (
        <section className="flex flex-col items-center text-center pb-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent-soft tabular-nums">
            ✦  issue {Math.max(1, Math.floor(total / 8) + 1)} · the room
          </span>
          <h1 className="font-display text-4xl sm:text-6xl mt-4 leading-[1.02]">
            Quiet conversations,
            <br />
            <span className="italic text-accent-soft">served warm.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted leading-relaxed">
            An anonymous blog you can drop into without an account. Read, react,
            reply &mdash; or pull up a chair and write something yourself.
          </p>
        </section>
      ) : null}

      {page === 0 && hero ? (
        <HeroCard
          post={hero}
          author={hero.user_id ? authors.get(hero.user_id) : undefined}
          counts={reactionMap.get(`post:${hero.id}`) ?? []}
          selfId={me?.id ?? null}
        />
      ) : null}

      {(page === 0 ? rest : posts).length > 0 ? (
        <>
          {page === 0 ? (
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted shrink-0">
                more from the room
              </span>
              <span className="h-px flex-1 bg-line"></span>
            </div>
          ) : null}
          <section className="grid gap-6 sm:grid-cols-2">
            {(page === 0 ? rest : posts).map((p) => (
              <PostCard
                key={p.id}
                post={p}
                author={p.user_id ? authors.get(p.user_id) : undefined}
                counts={reactionMap.get(`post:${p.id}`) ?? []}
                selfId={me?.id ?? null}
              />
            ))}
          </section>
        </>
      ) : null}

      <nav className="flex justify-between items-center text-sm border-t border-line pt-6">
        {hasPrev ? (
          <Link
            href={page - 1 === 0 ? "/" : `/?p=${page - 1}`}
            className="text-accent hover:text-accent-soft transition-colors"
          >
            ← newer
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted">
          page {page + 1} · {total} posts
        </span>
        {hasNext ? (
          <Link
            href={`/?p=${page + 1}`}
            className="text-accent hover:text-accent-soft transition-colors"
          >
            older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}

type Author = { username: string; avatar_path: string | null; isMine: boolean; iFollow: boolean };

type CardProps = {
  post: PostWithCount;
  author?: Author;
  counts: Array<{ emoji: string; n: number; mine: 0 | 1 }>;
  selfId: string | null;
};

function HeroCard({ post, author, counts, selfId }: CardProps) {
  return (
    <article className="surface-card overflow-hidden">
      <Link href={`/post/${post.id}`} className="block group">
        {post.image_path ? (
          <div className="aspect-[16/9] w-full bg-line overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_path}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.015] transition-transform duration-500"
              loading="eager"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="aspect-[16/5] w-full bg-gradient-to-br from-accent/15 via-background-2 to-accent-soft/20"
          />
        )}
      </Link>
      <div className="p-6 sm:p-10 space-y-5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-accent-soft">
          <span aria-hidden>✦</span>
          <span>featured</span>
        </div>
        <Link href={`/post/${post.id}`} className="block group">
          <h2 className="font-display text-3xl sm:text-5xl leading-[1.05] group-hover:text-accent transition-colors">
            {post.title}
            {post.via_submission_id ? (
              <span className="ml-2 align-middle text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent font-sans">
                curated
              </span>
            ) : null}
          </h2>
          <p className="mt-5 font-serif text-lg sm:text-xl text-foreground/80 leading-[1.55]">
            {excerpt(post.body, 260)}
          </p>
        </Link>
        <AuthorRow post={post} author={author} selfId={selfId} />
        <FooterRow post={post} counts={counts} selfId={selfId} />
      </div>
    </article>
  );
}

function PostCard({ post, author, counts, selfId }: CardProps) {
  return (
    <article className="surface-card overflow-hidden flex flex-col">
      <Link href={`/post/${post.id}`} className="block group">
        {post.image_path ? (
          <div className="aspect-[16/10] w-full bg-line overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_path}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
            />
          </div>
        ) : (
          <div
            aria-hidden
            className="aspect-[16/5] w-full bg-gradient-to-br from-accent/10 via-background-2 to-accent-soft/15"
          />
        )}
      </Link>
      <div className="p-5 sm:p-6 flex-1 flex flex-col gap-3">
        <Link href={`/post/${post.id}`} className="block group flex-1">
          <h3 className="font-display text-2xl sm:text-3xl leading-[1.08] group-hover:text-accent transition-colors">
            {post.title}
            {post.via_submission_id ? (
              <span className="ml-2 align-middle text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent font-sans">
                curated
              </span>
            ) : null}
          </h3>
          <p className="mt-3 font-serif text-base text-foreground/75 line-clamp-3 leading-[1.55]">
            {excerpt(post.body, 200)}
          </p>
        </Link>
        <AuthorRow post={post} author={author} selfId={selfId} compact />
        <FooterRow post={post} counts={counts} selfId={selfId} compact />
      </div>
    </article>
  );
}

function AuthorRow({
  post,
  author,
  selfId,
  compact = false,
}: {
  post: PostWithCount;
  author?: Author;
  selfId: string | null;
  compact?: boolean;
}) {
  const avatarSize = compact ? 24 : 32;
  return (
    <div className="flex items-center gap-2 text-xs">
      {author ? (
        <>
          <Link
            href={`/u/${author.username}`}
            className="flex items-center gap-2 hover:text-accent"
          >
            <Avatar
              username={author.username}
              avatarPath={author.avatar_path}
              size={avatarSize}
            />
            <span className="font-medium text-foreground/85">
              @{author.username}
            </span>
          </Link>
          {selfId && !author.isMine ? (
            <form action={toggleFollow} className="inline-block ml-1">
              <input type="hidden" name="username" value={author.username} />
              <input
                type="hidden"
                name="action"
                value={author.iFollow ? "unfollow" : "follow"}
              />
              <button
                type="submit"
                className={"btn-pill " + (author.iFollow ? "is-active" : "")}
              >
                {author.iFollow ? "following" : "follow"}
              </button>
            </form>
          ) : !selfId ? (
            <Link
              href={`/signup?next=${encodeURIComponent(`/u/${author.username}`)}`}
              title="Sign up to follow"
              className="btn-pill ml-1"
            >
              follow
            </Link>
          ) : null}
        </>
      ) : (
        <span className="text-muted">{post.handle}</span>
      )}
      <span className="text-muted">·</span>
      <span className="text-muted">{relativeTime(post.created_at)}</span>
    </div>
  );
}

function FooterRow({
  post,
  counts,
  selfId,
  compact = false,
}: {
  post: PostWithCount;
  counts: Array<{ emoji: string; n: number; mine: 0 | 1 }>;
  selfId: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center justify-between gap-3 " +
        (compact ? "pt-2 border-t border-line" : "pt-3 border-t border-line")
      }
    >
      <Reactions
        kind="post"
        targetId={post.id}
        selfId={selfId}
        counts={counts}
      />
      <Link
        href={`/post/${post.id}#comments`}
        className="text-xs text-muted hover:text-accent flex items-center gap-1"
      >
        💬 {post.comment_count}
      </Link>
    </div>
  );
}
