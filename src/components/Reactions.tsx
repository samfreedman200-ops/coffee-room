import {
  REACTION_EMOJI,
  reactionsFor,
  type ReactionCount,
  type ReactionTargetKind,
} from "@/lib/reactions";
import { toggleReactionAction } from "@/app/reactions/actions";

type Props = {
  kind: ReactionTargetKind;
  targetId: string;
  selfId: string | null;
  /** Anonymous cookie id (already resolved by the page). Lets the "mine"
   *  highlight survive across renders without making the client component fetch. */
  anonId?: string | null;
  /** Precomputed counts. Pass this when rendering many at once to skip the DB query. */
  counts?: ReactionCount[];
};

export function Reactions({
  kind,
  targetId,
  selfId,
  anonId = null,
  counts,
}: Props) {
  const resolved = counts ?? reactionsFor(kind, targetId, selfId, anonId);
  const existing = new Map(resolved.map((c) => [c.emoji, c]));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_EMOJI.map((emoji) => {
        const entry = existing.get(emoji);
        const mine = entry?.mine === 1;
        const n = entry?.n ?? 0;
        return (
          <form
            action={toggleReactionAction}
            key={emoji}
            className="inline-block"
          >
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="target_id" value={targetId} />
            <input type="hidden" name="emoji" value={emoji} />
            <button
              type="submit"
              title={
                mine
                  ? "Remove your reaction"
                  : selfId
                    ? "React"
                    : "React (anonymous — counts on this browser)"
              }
              className={"chip-react " + (mine ? "is-mine" : "")}
            >
              <span aria-hidden>{emoji}</span>
              {n > 0 ? <span className="tabular-nums">{n}</span> : null}
            </button>
          </form>
        );
      })}
    </div>
  );
}
