import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  let dbOk = false;
  let userCount = 0;
  let postCount = 0;
  try {
    userCount = (db().prepare(`SELECT COUNT(*) AS n FROM users`).get() as {
      n: number;
    }).n;
    postCount = (db().prepare(`SELECT COUNT(*) AS n FROM posts`).get() as {
      n: number;
    }).n;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    counts: dbOk ? { users: userCount, posts: postCount } : undefined,
    uptime_s: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: dbOk ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
