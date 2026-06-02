#!/usr/bin/env node
/**
 * Seed the DB with a handful of sample posts, comments, and reactions
 * so the landing page has something to show.
 *
 *   node scripts/seed-samples.mjs           # idempotent — won't duplicate
 *   node scripts/seed-samples.mjs --reset   # wipe sample rows first
 *
 * Sample users have usernames prefixed `sample_`. Posts created here use
 * fixed ids prefixed `seed-` so re-runs are idempotent.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const DB_PATH = join(projectRoot, "data", "coffee-room.db");
const DB_DIR = join(projectRoot, "data");

const RESET = process.argv.includes("--reset");

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Sample users ──────────────────────────────────────────────────────────
const SAMPLE_USERS = [
  {
    id: "seed-user-mira",
    username: "sample_mira",
    bio: "Writes about quiet mornings. Long espressos, longer walks.",
    role: "contributor",
  },
  {
    id: "seed-user-theo",
    username: "sample_theo",
    bio: "Notebooks, fountain pens, and the smell of cardamom.",
    role: "contributor",
  },
  {
    id: "seed-user-jules",
    username: "sample_jules",
    bio: "Field sketches and unfinished thoughts.",
    role: "user",
  },
];

// ─── Sample posts ──────────────────────────────────────────────────────────
const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const SAMPLE_POSTS = [
  {
    id: "seed-post-1",
    user: "seed-user-mira",
    title: "On the value of a slower morning",
    image: "/samples/morning.svg",
    body:
      "The kettle hisses. The window glass is the color of a worn nickel. Outside, a dog walker pulls a Labrador toward a smell.\n\n" +
      "I used to wake up and check my phone before I could focus my eyes. Now I make coffee first. The coffee comes first because the act of grinding the beans gives my hands something honest to do.\n\n" +
      "There's a kind of morning where you can hear yourself think and a kind where you can't. The phone tilts the scale.",
    ago: 2 * HOUR,
  },
  {
    id: "seed-post-2",
    user: "seed-user-theo",
    title: "Field notes from a rainy bus",
    image: "/samples/window.svg",
    body:
      "**Tuesday.** Rain against the window in a pattern that's almost a language.\n\n" +
      "A woman across the aisle is reading a paperback with the corners bent inward. I can see the title is in Polish. She laughs at something on page 184 and looks around to see if anyone noticed.\n\n" +
      "I noticed.\n\n" +
      "> The world is full of small private moments that nobody is going to write down.\n\n" +
      "So I'm writing this one down.",
    ago: 5 * HOUR,
  },
  {
    id: "seed-post-3",
    user: "seed-user-mira",
    title: "Cup notes: the third pull",
    image: "/samples/cup.svg",
    body:
      "I've been pulling a ratio I'd never tried before — 1:1.8, ground a little coarser than I usually would, and it's been opening up flavors I didn't know the bean had.\n\n" +
      "Notes: dried apricot, a long warm finish that reminds me of brown butter. The crema is thinner than the textbook picture but that's fine. The textbook picture wasn't drinking it.",
    ago: 9 * HOUR,
  },
  {
    id: "seed-post-4",
    user: "seed-user-jules",
    title: "Drawing in the margin again",
    image: "/samples/notebook.svg",
    body:
      "I haven't kept a sketchbook in years and today I picked one up at a stationery store on the corner and bought it before I could talk myself out of it.\n\n" +
      "The first page is always the worst because the first page is the only page that gets looked at. I drew a snail and then a window with bad perspective and then closed the cover.\n\n" +
      "Tomorrow I'll open it again. That's the whole project.",
    ago: 14 * HOUR,
  },
  {
    id: "seed-post-5",
    user: "seed-user-theo",
    title: "A neighborhood is a soundtrack",
    image: "/samples/street.svg",
    body:
      "Two men were arguing about a parking space in a language I didn't recognize. A kid on a scooter rang a bell five times in a row to nobody in particular. A delivery driver was singing along to a song through the open window of his van.\n\n" +
      "If you live somewhere long enough, you stop hearing it as noise and start hearing it as the building you live inside of.",
    ago: 1 * DAY,
  },
  {
    id: "seed-post-6",
    user: null, // anonymous
    title: "Why I closed my account on the other place",
    image: null,
    body:
      "I won't name it. You know the one.\n\n" +
      "I closed it because every time I posted something I cared about, the metrics told me whether to feel good or bad about caring. That can't be the right shape for a tool you use every day.\n\n" +
      "I'm trying this place because there's no number under what I write. Nobody can tell me whether to feel good about it. That's the whole point.",
    ago: 2 * DAY,
  },
  {
    id: "seed-post-7",
    user: "seed-user-jules",
    title: "Three things I drew on the bus",
    image: "/samples/sketch.svg",
    body:
      "1. A man's left ear, from behind, because that's all I could see.\n2. A teapot at the cafe where I got off, but only the handle because I was waiting for the milk.\n3. The corner of the cafe window, where condensation had pooled into the shape of a comma.\n\n" +
      "None of them were good. All of them were enough.",
    ago: 3 * DAY,
  },
  {
    id: "seed-post-8",
    user: null,
    title: "A reading list, lightly",
    image: null,
    body:
      "Things I've gone back to lately:\n\n" +
      "- The opening chapter of **The Friend** by Sigrid Nunez, again, for the voice.\n" +
      "- Anne Carson's *Plainwater*, but only the parts that look like prose.\n" +
      "- A 2003 essay called \"On Keeping a Notebook\" — Didion, of course.\n" +
      "- The recipe card my grandmother labelled with the wrong measurements for cardamom buns.\n\n" +
      "None of these belong on the same shelf. That's why they belong on the same list.",
    ago: 4 * DAY,
  },
];

// ─── Sample comments + reactions ───────────────────────────────────────────
const SAMPLE_COMMENTS = [
  // on post 1
  { post: "seed-post-1", user: "seed-user-theo", body: "The grinder noise is honest work. I felt this." },
  { post: "seed-post-1", user: "seed-user-jules", body: "Same. The phone-first morning kept me jittery for a year." },
  { post: "seed-post-1", user: null, body: "Quiet Espresso #4821 here. This post is the day I'm trying to have tomorrow." },
  // on post 2
  { post: "seed-post-2", user: "seed-user-mira", body: "The line about the small private moments is going on my wall." },
  // on post 3
  { post: "seed-post-3", user: "seed-user-theo", body: "Try 1:1.6 with a slightly hotter pull. Same direction, more pronounced." },
  { post: "seed-post-3", user: "seed-user-mira", body: "@sample_theo I will. Also: glad you're back from the trip." },
  // on post 5
  { post: "seed-post-5", user: "seed-user-jules", body: "The kid with the bell could be in my neighborhood too." },
  // on post 6
  { post: "seed-post-6", user: "seed-user-mira", body: "Welcome." },
  // on post 8
  { post: "seed-post-8", user: "seed-user-theo", body: "Adding *Plainwater* to my pile. Thank you." },
];

const SAMPLE_REACTIONS = [
  { post: "seed-post-1", user: "seed-user-theo", emoji: "❤️" },
  { post: "seed-post-1", user: "seed-user-jules", emoji: "❤️" },
  { post: "seed-post-1", user: "seed-user-mira", emoji: "🔥" },
  { post: "seed-post-2", user: "seed-user-mira", emoji: "❤️" },
  { post: "seed-post-3", user: "seed-user-jules", emoji: "👍" },
  { post: "seed-post-3", user: "seed-user-theo", emoji: "🔥" },
  { post: "seed-post-4", user: "seed-user-mira", emoji: "❤️" },
  { post: "seed-post-5", user: "seed-user-theo", emoji: "❤️" },
  { post: "seed-post-5", user: "seed-user-jules", emoji: "👀" },
  { post: "seed-post-6", user: "seed-user-mira", emoji: "🤔" },
  { post: "seed-post-7", user: "seed-user-theo", emoji: "❤️" },
  { post: "seed-post-8", user: "seed-user-jules", emoji: "👍" },
];

// ─── Reset ────────────────────────────────────────────────────────────────
if (RESET) {
  console.log("resetting sample rows…");
  // Cascades through reactions/comments/follows/etc.
  db.prepare(`DELETE FROM posts WHERE id LIKE 'seed-post-%'`).run();
  db.prepare(`DELETE FROM users WHERE id LIKE 'seed-user-%'`).run();
}

// ─── Users ────────────────────────────────────────────────────────────────
const password = "samplepass1234";
const passwordHash = bcrypt.hashSync(password, 10);
const recoveryHash = bcrypt.hashSync(
  randomBytes(20).toString("hex").toUpperCase().slice(0, 20),
  10,
);

const userInsert = db.prepare(
  `INSERT OR IGNORE INTO users
   (id, username, password_hash, recovery_hash, avatar_path, bio, role, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);

for (const u of SAMPLE_USERS) {
  userInsert.run(
    u.id,
    u.username,
    passwordHash,
    recoveryHash,
    null,
    u.bio,
    u.role,
    NOW - 30 * DAY,
  );
}

// ─── Posts ────────────────────────────────────────────────────────────────
const postInsert = db.prepare(
  `INSERT OR IGNORE INTO posts
   (id, title, body, handle, user_id, via_submission_id, status, edited_at,
    removed_by, image_path, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const userByIdStmt = db.prepare(`SELECT username FROM users WHERE id = ?`);

for (const p of SAMPLE_POSTS) {
  const handle = p.user
    ? `@${userByIdStmt.get(p.user)?.username ?? "anonymous"}`
    : "Quiet Espresso #" + (1000 + Math.floor(Math.random() * 8999));
  postInsert.run(
    p.id,
    p.title,
    p.body,
    handle,
    p.user,
    null,
    "published",
    null,
    null,
    p.image,
    NOW - p.ago,
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────
const commentInsert = db.prepare(
  `INSERT OR IGNORE INTO comments
   (id, post_id, body, handle, user_id, parent_id, status, edited_at,
    removed_by, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

SAMPLE_COMMENTS.forEach((c, i) => {
  const handle = c.user
    ? `@${userByIdStmt.get(c.user)?.username ?? "anonymous"}`
    : "Quiet Espresso #" + (4000 + i);
  commentInsert.run(
    `seed-comment-${i}`,
    c.post,
    c.body,
    handle,
    c.user,
    null,
    "published",
    null,
    null,
    NOW - (1 * HOUR + i * 13 * 60 * 1000),
  );
});

// ─── Reactions ────────────────────────────────────────────────────────────
const reactionInsert = db.prepare(
  `INSERT OR IGNORE INTO reactions
   (user_id, target_kind, target_id, emoji, created_at)
   VALUES (?, 'post', ?, ?, ?)`,
);
SAMPLE_REACTIONS.forEach((r, i) => {
  reactionInsert.run(r.user, r.post, r.emoji, NOW - (30 * 60 * 1000 + i * 60_000));
});

// ─── Follows ──────────────────────────────────────────────────────────────
const followInsert = db.prepare(
  `INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at)
   VALUES (?, ?, ?)`,
);
followInsert.run("seed-user-jules", "seed-user-mira", NOW - 20 * DAY);
followInsert.run("seed-user-jules", "seed-user-theo", NOW - 18 * DAY);
followInsert.run("seed-user-theo", "seed-user-mira", NOW - 25 * DAY);

console.log(
  `seeded ${SAMPLE_USERS.length} users, ${SAMPLE_POSTS.length} posts, ` +
    `${SAMPLE_COMMENTS.length} comments, ${SAMPLE_REACTIONS.length} reactions.`,
);
console.log(`sample login: any of @${SAMPLE_USERS.map((u) => u.username).join(", @")}`);
console.log(`sample password: ${password}`);
db.close();
