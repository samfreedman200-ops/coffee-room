# Coffee Room

> An anonymous blog. Quiet conversations.

A self-hosted, account-optional micro-blog. Drop in without signing up — read,
react, reply, follow, message. Bring your own pen if you want one.

Built on Next.js 16 + SQLite. Single Node process, single database file,
deploys to any VPS in under five minutes.

## What's in the room

- **Anonymous-first.** Read everything without an account. Comment, react, and
  thread replies — all keyed by a per-browser cookie so identity persists
  without ever asking for an email or phone number.
- **Real accounts when you want them.** Username + password + 4 security
  questions + a one-time recovery phrase. No email, no SMS, no third-party
  auth. The first account on a fresh install auto-promotes to admin.
- **Reactions** — 👍 ❤️ 🔥 👀 🤔 on posts and comments. Counts merge from anon
  and account users.
- **Comments** with one level of threading and markdown.
- **DMs** between accounts. Per-thread unread badges.
- **Follow** anyone who has an account, and read a `/feed` of just their posts.
- **Contributor flow.** Users apply with a pitch; admin approves; contributors
  submit drafts for review; approved drafts publish as "curated" posts.
- **Moderation.** Report any post or comment. Admins triage from `/admin/reports`
  with an audit log of every action.
- **Magazine landing page.** Hero card on top, two-column grid below, hero
  images on every post (sharp-resized, EXIF stripped), display serif for titles.
- **Search** across every post via SQLite FTS5.
- **RSS, sitemap, OG tags, robots.txt** out of the box.

## Stack

- **[Next.js 16](https://nextjs.org)** (App Router, Server Actions, Turbopack)
- **[SQLite](https://sqlite.org)** via `better-sqlite3` — single file, single
  writer, no extra services. WAL + auto-migrations.
- **[sharp](https://sharp.pixelplumbing.com/)** for avatar + post image processing
  (resize, EXIF strip, WebP encode)
- **[Tailwind CSS v4](https://tailwindcss.com)** + custom design tokens
- **[Fraunces](https://fonts.google.com/specimen/Fraunces)** variable serif +
  **[Crimson Pro](https://fonts.google.com/specimen/Crimson+Pro)** + **Geist**
- **bcryptjs** for password / recovery / security-question hashing
- Zero-dep in-memory rate limiter and JSON-line structured logger

## Quick start

```bash
git clone <this-repo> coffee-room
cd coffee-room
npm install
npm run seed       # optional: load sample users + posts
npm run dev
```

Open <http://localhost:3000>.

The first account you sign up becomes admin automatically.

## Sample accounts

After `npm run seed`, log in as any of:

- `sample_mira` — contributor, 2 posts
- `sample_theo` — contributor, 2 posts
- `sample_jules` — user, 2 posts

Password for all three: `samplepass1234`.

## Production

See [`DEPLOY.md`](DEPLOY.md) for a step-by-step deployment guide
(PM2 / systemd, Nginx / Caddy, backups, monitoring).

The short version:

```bash
cp .env.example .env  # fill in SITE_URL etc.
npm ci
npm run build
pm2 start ecosystem.config.cjs
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run seed` | Seed sample users + posts + reactions (idempotent) |
| `npm run seed:reset` | Wipe sample rows and re-seed |
| `npm run backup` | `VACUUM INTO` snapshot of the DB → `backups/` |
| `npm run backup:keep30` | Same, prunes backups older than 30 days |
| `npm run sweep:avatars` | Dry-run orphan avatar file detection |
| `npm run sweep:avatars:apply` | Delete orphan avatar files |

## Security highlights

- All cookies `HttpOnly + SameSite=Lax + Secure` (Secure in prod)
- CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy set
  via [`next.config.ts`](next.config.ts)
- Rate limits per-IP **and** per-username on auth + recovery
- Recovery / password change invalidates all other sessions
- Open-redirect-safe `next=` handling
- Markdown renderer is pure JSX (no `dangerouslySetInnerHTML`); URL allowlist
  rejects protocol-relative bypasses
- Sharp-processed avatars + post images strip EXIF before storage
- Admin actions audit-logged

A full security audit walkthrough is in the project history.

## Project layout

```
src/
  app/                  Next.js routes (App Router)
    actions.ts          Post/comment/edit/delete/report server actions
    auth-actions.ts     Signup/login/logout
    admin/              Admin queues (contributors, submissions, reports, audit)
    api/health/         Liveness check
    dm/                 Direct messages
    post/[id]/          Article detail + edit
    submissions/        Curated submission flow
    ...
  components/           Shared UI (Avatar, Reactions)
  lib/                  Domain modules (auth, posts, dms, ...)
public/
  samples/              Seed-script SVG hero images
scripts/
  backup.mjs            VACUUM INTO snapshot
  seed-samples.mjs      Sample content seed
  sweep-avatars.mjs     Orphan-file sweep
data/                   SQLite DB (gitignored)
```

## License

MIT. Drink responsibly.
