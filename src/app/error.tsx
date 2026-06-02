"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="py-20 text-center space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">
        Something went wrong.
      </h1>
      <p className="text-sm text-muted">
        We&apos;ve logged it. Try again, or head home.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={reset}
          className="text-sm px-3 py-1.5 rounded-md border border-line hover:border-accent hover:text-accent"
        >
          try again
        </button>
        <Link
          href="/"
          className="text-sm px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90"
        >
          home
        </Link>
      </div>
      {error.digest ? (
        <p className="text-[10px] text-muted/60 font-mono pt-4">
          ref: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
