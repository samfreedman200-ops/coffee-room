import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Not here.</h1>
      <p className="text-sm text-muted">
        That page doesn&apos;t exist, or it was removed.
      </p>
      <Link
        href="/"
        className="inline-block text-sm text-accent hover:underline"
      >
        ← back to the room
      </Link>
    </div>
  );
}
