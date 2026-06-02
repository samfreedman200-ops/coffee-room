import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getPost } from "@/lib/posts";
import { editPost } from "@/app/actions";

export default async function EditPostPage(
  props: PageProps<"/post/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await currentUser();
  if (!me) redirect(`/login?next=/post/${id}/edit`);
  const post = getPost(id);
  if (!post) notFound();
  if (post.user_id !== me.id) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/post/${id}`}
        className="text-xs text-muted hover:text-accent inline-block"
      >
        ← cancel
      </Link>
      <h1 className="text-sm text-muted uppercase tracking-wider">
        editing post
      </h1>
      <form action={editPost} className="space-y-6">
        <input type="hidden" name="id" value={id} />
        <input
          name="title"
          defaultValue={post.title}
          required
          maxLength={200}
          className="w-full bg-transparent text-2xl font-medium tracking-tight focus:outline-none"
          autoFocus
        />
        <textarea
          name="body"
          required
          maxLength={10000}
          rows={14}
          defaultValue={post.body}
          className="w-full bg-transparent text-base leading-relaxed focus:outline-none resize-none"
        />
        <div className="flex items-center justify-end pt-4 border-t border-line">
          <button
            type="submit"
            className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
          >
            save changes
          </button>
        </div>
      </form>
    </div>
  );
}
