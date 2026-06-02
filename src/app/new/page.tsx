import { createPost } from "@/app/actions";
import { currentUser } from "@/lib/auth";

export default async function NewPostPage(props: PageProps<"/new">) {
  const user = await currentUser();
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.25em] text-accent-soft">
          ✦  write something
        </span>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.02] mt-3">
          What&apos;s on your <span className="italic text-accent-soft">mind?</span>
        </h1>
      </div>

      {error ? (
        <div className="text-sm text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      ) : null}

      <form
        action={createPost}
        encType="multipart/form-data"
        className="surface-card p-6 sm:p-8 space-y-6"
      >
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="Title"
          className="w-full bg-transparent font-serif text-2xl sm:text-3xl leading-tight tracking-tight placeholder:text-muted/50 focus:outline-none"
          autoFocus
        />

        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted">
            optional hero image (&lt; 8 MB, EXIF stripped on upload)
          </span>
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="mt-2 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-foreground file:font-medium hover:file:bg-accent hover:file:text-white file:transition-colors"
          />
        </label>

        <textarea
          name="body"
          required
          maxLength={10000}
          rows={14}
          placeholder="Say what's on your mind. Markdown supported — use ![alt](/path/to.png) for inline images."
          className="w-full bg-transparent text-base leading-relaxed placeholder:text-muted/50 focus:outline-none resize-none"
        />

        <div className="flex items-center justify-between pt-4 border-t border-line gap-3">
          {user ? (
            <label className="text-xs text-muted flex items-center gap-2 select-none">
              <input type="checkbox" name="anon" />
              Post anonymously (hide @{user.username})
            </label>
          ) : (
            <p className="text-xs text-muted">
              Posted anonymously. You&apos;ll get a handle.
            </p>
          )}
          <button type="submit" className="btn-accent px-5 py-2 text-sm">
            post
          </button>
        </div>
      </form>
    </div>
  );
}
