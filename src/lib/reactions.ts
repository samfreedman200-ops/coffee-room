import { db } from "./db";

export const REACTION_EMOJI = ["👍", "❤️", "🔥", "👀", "🤔"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];
export type ReactionTargetKind = "post" | "comment";

export function isValidEmoji(s: string): s is ReactionEmoji {
  return (REACTION_EMOJI as ReadonlyArray<string>).includes(s);
}

export function toggleReaction(
  userId: string,
  targetKind: ReactionTargetKind,
  targetId: string,
  emoji: ReactionEmoji,
): "added" | "removed" {
  const existing = db()
    .prepare(
      `SELECT 1 FROM reactions
       WHERE user_id = ? AND target_kind = ? AND target_id = ? AND emoji = ?`,
    )
    .get(userId, targetKind, targetId, emoji);

  if (existing) {
    db()
      .prepare(
        `DELETE FROM reactions
         WHERE user_id = ? AND target_kind = ? AND target_id = ? AND emoji = ?`,
      )
      .run(userId, targetKind, targetId, emoji);
    return "removed";
  }

  db()
    .prepare(
      `INSERT INTO reactions (user_id, target_kind, target_id, emoji, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, targetKind, targetId, emoji, Date.now());
  return "added";
}

/** Same toggle semantics but keyed on an anonymous cookie id. */
export function toggleAnonReaction(
  anonId: string,
  targetKind: ReactionTargetKind,
  targetId: string,
  emoji: ReactionEmoji,
): "added" | "removed" {
  const existing = db()
    .prepare(
      `SELECT 1 FROM anon_reactions
       WHERE anon_id = ? AND target_kind = ? AND target_id = ? AND emoji = ?`,
    )
    .get(anonId, targetKind, targetId, emoji);

  if (existing) {
    db()
      .prepare(
        `DELETE FROM anon_reactions
         WHERE anon_id = ? AND target_kind = ? AND target_id = ? AND emoji = ?`,
      )
      .run(anonId, targetKind, targetId, emoji);
    return "removed";
  }

  db()
    .prepare(
      `INSERT INTO anon_reactions (anon_id, target_kind, target_id, emoji, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(anonId, targetKind, targetId, emoji, Date.now());
  return "added";
}

export type ReactionCount = { emoji: string; n: number; mine: 0 | 1 };

export function reactionsFor(
  targetKind: ReactionTargetKind,
  targetId: string,
  selfId: string | null,
  anonId: string | null = null,
): ReactionCount[] {
  // Merge user + anon counts for one target.
  const rows = db()
    .prepare(
      `SELECT emoji,
              SUM(n) AS n,
              MAX(mine) AS mine
       FROM (
         SELECT emoji,
                COUNT(*) AS n,
                MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
         FROM reactions
         WHERE target_kind = ? AND target_id = ?
         GROUP BY emoji
         UNION ALL
         SELECT emoji,
                COUNT(*) AS n,
                MAX(CASE WHEN anon_id = ? THEN 1 ELSE 0 END) AS mine
         FROM anon_reactions
         WHERE target_kind = ? AND target_id = ?
         GROUP BY emoji
       )
       GROUP BY emoji
       ORDER BY n DESC, emoji ASC`,
    )
    .all(selfId ?? "", targetKind, targetId, anonId ?? "", targetKind, targetId) as ReactionCount[];
  return rows;
}

/**
 * One-shot batched lookup across many targets. Merges user and anon
 * reactions so the visible count = both combined. `mine` accounts for
 * either a logged-in user OR an anonymous cookie match.
 */
export function reactionsForTargets(
  targets: Array<{ kind: ReactionTargetKind; id: string }>,
  selfId: string | null,
  anonId: string | null = null,
): Map<string, ReactionCount[]> {
  const out = new Map<string, ReactionCount[]>();
  if (targets.length === 0) return out;

  const postIds = targets.filter((t) => t.kind === "post").map((t) => t.id);
  const commentIds = targets
    .filter((t) => t.kind === "comment")
    .map((t) => t.id);

  const rows: Array<{
    target_kind: ReactionTargetKind;
    target_id: string;
    emoji: string;
    n: number;
    mine: 0 | 1;
  }> = [];

  // Builds: union of user reactions + anon reactions, then GROUP BY to sum.
  const runFor = (kind: ReactionTargetKind, ids: string[]) => {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => "?").join(",");
    const all = db()
      .prepare(
        `SELECT target_kind, target_id, emoji,
                SUM(n) AS n,
                MAX(mine) AS mine
         FROM (
           SELECT target_kind, target_id, emoji,
                  COUNT(*) AS n,
                  MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
           FROM reactions
           WHERE target_kind = ? AND target_id IN (${placeholders})
           GROUP BY target_kind, target_id, emoji
           UNION ALL
           SELECT target_kind, target_id, emoji,
                  COUNT(*) AS n,
                  MAX(CASE WHEN anon_id = ? THEN 1 ELSE 0 END) AS mine
           FROM anon_reactions
           WHERE target_kind = ? AND target_id IN (${placeholders})
           GROUP BY target_kind, target_id, emoji
         )
         GROUP BY target_kind, target_id, emoji
         ORDER BY n DESC, emoji ASC`,
      )
      .all(
        selfId ?? "",
        kind,
        ...ids,
        anonId ?? "",
        kind,
        ...ids,
      ) as typeof rows;
    rows.push(...all);
  };

  runFor("post", postIds);
  runFor("comment", commentIds);

  for (const r of rows) {
    const key = `${r.target_kind}:${r.target_id}`;
    const arr = out.get(key);
    const entry = { emoji: r.emoji, n: r.n, mine: r.mine };
    if (arr) arr.push(entry);
    else out.set(key, [entry]);
  }

  return out;
}
