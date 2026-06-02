import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  type Comment,
  getPost,
  listComments,
} from "@/lib/posts";
import { relativeTime } from "@/lib/time";
import { SITE_NAME, SITE_URL } from "@/lib/env";

export async function generateMetadata(
  props: PageProps<"/post/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post || post.status === "removed") {
    return { title: `Post — ${SITE_NAME}` };
  }
  const description = post.body.replace(/\s+/g, " ").trim().slice(0, 200);
  const url = `${SITE_URL}/post/${post.id}`;
  return {
    title: `${post.title} — ${SITE_NAME}`,
    description,
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: new Date(post.created_at).toISOString(),
      modifiedTime: post.edited_at
        ? new Date(post.edited_at).toISOString()
        : undefined,
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
    alternates: { canonical: url },
  };
}
import {
  adminRemoveComment,
  adminRemovePost,
  createComment,
  deleteOwnComment,
  deleteOwnPost,
  editComment,
  reportContent,
} from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { Avatar } from "@/components/Avatar";
import { Markdown } from "@/lib/markdown";
import { Reactions } from "@/components/Reactions";
import { reactionsForTargets } from "@/lib/reactions";
import { readAnonId } from "@/lib/anon";

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const post = getPost(id);
  if (!post) notFound();

  const removed = post.status === "removed";
  const me = await currentUser();
  const author = post.user_id ? getUserById(post.user_id) : null;
  const comments = listComments(id);

  const commentAuthors = new Map<string, ReturnType<typeof getUserById>>();
  for (const c of comments) {
    if (c.user_id && !commentAuthors.has(c.user_id)) {
      commentAuthors.set(c.user_id, getUserById(c.user_id));
    }
  }

  // Build a tree: top-level comments + their direct children.
  const childrenByParent = new Map<string, Comment[]>();
  const topLevel: Comment[] = [];
  for (const c of comments) {
    if (c.parent_id) {
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    } else {
      topLevel.push(c);
    }
  }

  const visiblePublishedCount = comments.filter(
    (c) => c.status === "published",
  ).length;

  const anonId = me ? null : await readAnonId();

  // Pre-fetch reactions for the post and every comment in one batched query
  // (instead of one DB call per Reactions render).
  const reactionTargets: Array<{ kind: "post" | "comment"; id: string }> = [
    { kind: "post", id: post.id },
    ...comments.map((c) => ({ kind: "comment" as const, id: c.id })),
  ];
  const reactionMap = reactionsForTargets(
    reactionTargets,
    me?.id ?? null,
    anonId,
  );
  const reactionsFor = (kind: "post" | "comment", id: string) =>
    reactionMap.get(`${kind}:${id}`) ?? [];

  return (
    <div className="space-y-14">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.18em] text-muted hover:text-accent inline-block transition-colors"
      >
        ← back to the room
      </Link>

      <article className="space-y-6">
        {post.image_path ? (
          <div className="rounded-xl overflow-hidden border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_path}
              alt=""
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {post.via_submission_id ? (
              <span className="text-[10px] uppercase tracking-[0.22em] px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                curated
              </span>
            ) : null}
            {removed ? (
              <span className="text-[10px] uppercase tracking-[0.22em] text-red-600 dark:text-red-400">
                removed
              </span>
            ) : null}
          </div>
          <h1 className="font-display text-4xl sm:text-6xl leading-[1.02]">
            {post.title}
          </h1>
        </div>

        <div className="text-xs text-muted flex items-center gap-2 flex-wrap border-b border-line pb-5">
          {author ? (
            <>
              <Avatar
                username={author.username}
                avatarPath={author.avatar_path}
                size={22}
              />
              <Link
                href={`/u/${author.username}`}
                className="font-medium text-foreground/85 hover:text-accent transition-colors"
              >
                @{author.username}
              </Link>
            </>
          ) : (
            <span className="font-mono">{post.handle}</span>
          )}
          <span aria-hidden>·</span>
          <span>{relativeTime(post.created_at)}</span>
          {post.edited_at ? (
            <>
              <span aria-hidden>·</span>
              <span>edited {relativeTime(post.edited_at)}</span>
            </>
          ) : null}
        </div>

        <div className="prose-serif pt-2">
          {removed ? (
            <p className="text-muted italic">
              This post was removed by a moderator.
            </p>
          ) : (
            <Markdown text={post.body} />
          )}
        </div>

        {!removed ? (
          <div className="pt-2">
            <Reactions
              kind="post"
              targetId={post.id}
              selfId={me?.id ?? null}
              counts={reactionsFor("post", post.id)}
            />
          </div>
        ) : null}

        {!removed ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-2">
            {me?.id === post.user_id ? (
              <>
                <Link
                  href={`/post/${post.id}/edit`}
                  className="btn-ghost px-3 py-1 text-xs"
                >
                  edit
                </Link>
                <form action={deleteOwnPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <button
                    type="submit"
                    className="btn-ghost px-3 py-1 text-xs hover:!text-red-600 hover:!border-red-500"
                  >
                    delete
                  </button>
                </form>
              </>
            ) : null}
            {me && me.role === "admin" && me.id !== post.user_id ? (
              <form action={adminRemovePost} className="flex items-center gap-2">
                <input type="hidden" name="id" value={post.id} />
                <input
                  type="text"
                  name="note"
                  placeholder="removal note"
                  className="input-sm max-w-[180px]"
                />
                <button
                  type="submit"
                  className="btn-ghost px-3 py-1 text-xs hover:!text-red-600 hover:!border-red-500"
                >
                  admin remove
                </button>
              </form>
            ) : null}
            {me && me.id !== post.user_id ? (
              <form action={reportContent} className="flex items-center gap-2">
                <input type="hidden" name="kind" value="post" />
                <input type="hidden" name="target_id" value={post.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="report reason"
                  required
                  className="input-sm max-w-[180px]"
                />
                <button type="submit" className="btn-ghost px-3 py-1 text-xs">
                  report
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </article>

      <section id="comments" className="space-y-6 pt-2 scroll-mt-20">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted shrink-0">
            {visiblePublishedCount === 0
              ? "the table is quiet"
              : `${visiblePublishedCount} ${visiblePublishedCount === 1 ? "reply" : "replies"}`}
          </span>
          <span className="h-px flex-1 bg-line"></span>
        </div>

        <ul className="space-y-6">
          {topLevel.map((c) => (
            <CommentNode
              key={c.id}
              c={c}
              children={childrenByParent.get(c.id) ?? []}
              authors={commentAuthors}
              me={me}
              postId={post.id}
              reactionsFor={reactionsFor}
            />
          ))}
        </ul>

        {!removed ? (
          <form
            action={createComment}
            className="surface-card p-5 space-y-3"
          >
            <input type="hidden" name="post_id" value={post.id} />
            <textarea
              name="body"
              required
              maxLength={5000}
              rows={3}
              placeholder="Add to the conversation. Markdown supported."
              className="w-full bg-transparent text-sm leading-relaxed placeholder:text-muted/60 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
              {me ? (
                <label className="text-xs text-muted flex items-center gap-2 select-none">
                  <input type="checkbox" name="anon" />
                  Reply anonymously
                </label>
              ) : (
                <p className="text-xs text-muted">
                  You&apos;ll get a handle when you reply.
                </p>
              )}
              <button type="submit" className="btn-accent px-5 py-2 text-sm">
                reply
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

type ReactionsLookup = (
  kind: "post" | "comment",
  id: string,
) => Array<{ emoji: string; n: number; mine: 0 | 1 }>;

type CommentNodeProps = {
  c: Comment;
  children: Comment[];
  authors: Map<string, ReturnType<typeof getUserById>>;
  me: Awaited<ReturnType<typeof currentUser>>;
  postId: string;
  reactionsFor: ReactionsLookup;
};

function CommentNode({
  c,
  children,
  authors,
  me,
  postId,
  reactionsFor,
}: CommentNodeProps) {
  const ca = c.user_id ? authors.get(c.user_id) ?? null : null;
  const removed = c.status === "removed";
  const canEdit = me && c.user_id === me.id && !removed;
  const canAdminRemove = me?.role === "admin" && me.id !== c.user_id && !removed;
  const canReport = me && c.user_id !== me.id && !removed;

  return (
    <li className="space-y-2">
      <div className="text-xs text-muted flex items-center gap-2 flex-wrap">
        {ca ? (
          <>
            <Avatar
              username={ca.username}
              avatarPath={ca.avatar_path}
              size={18}
            />
            <Link
              href={`/u/${ca.username}`}
              className="font-medium text-foreground/80 hover:text-accent"
            >
              @{ca.username}
            </Link>
          </>
        ) : (
          <span className="font-medium text-foreground/80">{c.handle}</span>
        )}
        <span>·</span>
        <span>{relativeTime(c.created_at)}</span>
        {c.edited_at ? (
          <>
            <span>·</span>
            <span>edited</span>
          </>
        ) : null}
        {removed ? (
          <span className="text-red-600 dark:text-red-400">· removed</span>
        ) : null}
      </div>
      <div className="text-sm leading-relaxed">
        {removed ? (
          <p className="text-muted italic">[removed by moderator]</p>
        ) : (
          <Markdown text={c.body} />
        )}
      </div>

      {!removed ? (
        <Reactions
          kind="comment"
          targetId={c.id}
          selfId={me?.id ?? null}
          counts={reactionsFor("comment", c.id)}
        />
      ) : null}

      {!removed ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
          {me ? (
            <details className="inline-block">
              <summary className="hover:text-accent cursor-pointer list-none">
                reply
              </summary>
              <form
                action={createComment}
                className="mt-2 space-y-2 max-w-md"
              >
                <input type="hidden" name="post_id" value={postId} />
                <input type="hidden" name="parent_id" value={c.id} />
                <textarea
                  name="body"
                  required
                  maxLength={5000}
                  rows={2}
                  className="w-full text-sm leading-relaxed border border-line bg-card rounded-md px-3 py-2 focus:border-accent focus:outline-none resize-none"
                />
                <button
                  type="submit"
                  className="text-xs px-2 py-1 rounded-md border border-line hover:border-accent hover:text-accent"
                >
                  send reply
                </button>
              </form>
            </details>
          ) : null}
          {canEdit ? (
            <details className="inline-block">
              <summary className="hover:text-accent cursor-pointer list-none">
                edit
              </summary>
              <EditCommentForm c={c} />
            </details>
          ) : null}
          {canEdit ? (
            <form action={deleteOwnComment}>
              <input type="hidden" name="id" value={c.id} />
              <button
                type="submit"
                className="hover:text-red-600 dark:hover:text-red-400"
              >
                delete
              </button>
            </form>
          ) : null}
          {canAdminRemove ? (
            <form action={adminRemoveComment} className="flex items-center gap-1">
              <input type="hidden" name="id" value={c.id} />
              <input
                type="text"
                name="note"
                placeholder="note"
                className="px-1.5 py-0.5 rounded border border-line bg-card text-[10px]"
              />
              <button
                type="submit"
                className="hover:text-red-600 dark:hover:text-red-400"
              >
                admin remove
              </button>
            </form>
          ) : null}
          {canReport ? (
            <details className="inline-block">
              <summary className="hover:text-accent cursor-pointer list-none">
                report
              </summary>
              <form action={reportContent} className="mt-1 flex items-center gap-1">
                <input type="hidden" name="kind" value="comment" />
                <input type="hidden" name="target_id" value={c.id} />
                <input
                  type="text"
                  name="reason"
                  placeholder="reason"
                  required
                  className="px-1.5 py-0.5 rounded border border-line bg-card text-[10px]"
                />
                <button type="submit" className="hover:text-accent text-[10px]">
                  send
                </button>
              </form>
            </details>
          ) : null}
        </div>
      ) : null}

      {children.length > 0 ? (
        <ul className="pl-4 border-l border-line space-y-5 mt-3">
          {children.map((child) => (
            <CommentNode
              key={child.id}
              c={child}
              children={[]}
              authors={authors}
              me={me}
              postId={postId}
              reactionsFor={reactionsFor}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function EditCommentForm({ c }: { c: Comment }) {
  return (
    <form action={editComment} className="mt-2 space-y-2 max-w-md">
      <input type="hidden" name="id" value={c.id} />
      <textarea
        name="body"
        defaultValue={c.body}
        required
        maxLength={5000}
        rows={2}
        className="w-full text-sm border border-line bg-card rounded-md px-3 py-2 focus:border-accent focus:outline-none resize-none"
      />
      <button
        type="submit"
        className="text-xs px-2 py-1 rounded-md border border-line hover:border-accent hover:text-accent"
      >
        save
      </button>
    </form>
  );
}
