import Link from "next/link";
import { searchPosts } from "@/lib/posts";
import { relativeTime } from "@/lib/time";

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const results = q.trim() ? searchPosts(q, 30) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Search</h1>
        <p className="text-sm text-muted mt-1">
          Full-text search across posts.
        </p>
      </div>

      <form method="get" className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="search posts"
          className="flex-1 px-3 py-2 rounded-md border border-line bg-card focus:border-accent focus:outline-none text-sm"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2 rounded-md bg-accent text-white hover:opacity-90"
        >
          search
        </button>
      </form>

      {q ? (
        results.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center">
            No matches for &ldquo;{q}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {results.map((p) => (
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
                    <span>{p.handle}</span>
                    <span>·</span>
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
        )
      ) : null}
    </div>
  );
}
