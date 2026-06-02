# Deploying coffee-room

A Next.js 16 + SQLite app. Single Node process, single SQLite file on a
persistent disk. **Do not deploy to a serverless host** (Vercel free tier,
Cloudflare Workers, etc.) — SQLite needs a durable local volume.

Recommended targets:
- A small VPS (Hetzner CX11, DigitalOcean $6, Linode Nanode) running Linux.
- Railway, Render, or Fly.io with a persistent volume mounted at `./data`.
- A home server you control.

## Prerequisites

- Node.js **20.9+** (Next.js 16 requirement).
- `git`, `build-essential` (for the `better-sqlite3` and `sharp` native builds).
- A reverse proxy that terminates TLS (Nginx, Caddy, or your platform's
  built-in HTTPS).

## First-time setup

```bash
git clone <your-repo> coffee-room
cd coffee-room
npm ci                # production install
cp .env.example .env  # then edit .env with real values
npm run build
```

Edit `.env`:

```ini
SITE_URL=https://your-domain.example
SITE_NAME=Coffee Room
SITE_DESCRIPTION=An anonymous blog. Quiet conversations.
NODE_ENV=production
```

`SITE_URL` is used for OG tags, RSS, the sitemap, and `robots.txt`. Get it
right before sharing the URL anywhere.

## Running

### With PM2 (recommended)

```bash
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup       # follow the printed instruction to install the systemd unit
```

Tail logs:

```bash
pm2 logs coffee-room
```

### Or with systemd

```ini
# /etc/systemd/system/coffee-room.service
[Unit]
Description=coffee-room
After=network.target

[Service]
WorkingDirectory=/srv/coffee-room
EnvironmentFile=/srv/coffee-room/.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3000
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now coffee-room
journalctl -u coffee-room -f
```

## Reverse proxy

### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.example;

  ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

  client_max_body_size 6m;  # avatar uploads

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_redirect     off;
  }
}

server {
  listen 80;
  server_name your-domain.example;
  return 301 https://$host$request_uri;
}
```

### Caddy

```
your-domain.example {
  reverse_proxy 127.0.0.1:3000
}
```

Caddy auto-renews TLS via Let's Encrypt with zero config.

## First user is admin

The first account that signs up is automatically promoted to `admin`. So
the first thing to do after deploying is visit `/signup`, register your
account, **save the recovery phrase and security questions answers**, and
you'll be granted admin permissions.

## Backups

The included script takes a self-consistent SQLite snapshot using
`VACUUM INTO`, which is safe to run while the app is live:

```bash
npm run backup            # → backups/YYYY-MM-DDTHHMMSS.db
npm run backup:keep30     # also prunes backups older than 30 days
```

Cron it nightly:

```cron
0 3 * * *  cd /srv/coffee-room && /usr/bin/node scripts/backup.mjs --keep 30
```

Sync the `backups/` directory off-box (`rclone`, `restic`, `borgbackup`, S3).
A local copy alone is not a backup.

## Health check

`GET /api/health` returns:

```json
{
  "status": "ok",
  "db": true,
  "counts": { "users": 12, "posts": 47 },
  "uptime_s": 8421,
  "timestamp": "2026-05-29T01:23:45.678Z"
}
```

Status code is `200` when the DB is reachable, `503` when it isn't. Wire
this into uptime monitoring (UptimeRobot, BetterStack, etc.).

## Updates

```bash
git pull
npm ci
npm run build
pm2 restart coffee-room
```

Schema migrations are automatic — `db.ts` adds new columns and indexes on
boot if they're missing. No manual migration step.

## What lives where

| Path                  | Purpose                                   | Backed up?       |
|-----------------------|-------------------------------------------|------------------|
| `data/coffee-room.db` | Everything: users, posts, DMs, …          | **Yes** (script) |
| `public/avatars/`     | Uploaded avatar files (WebP)              | Mirror by hand   |
| `.env`                | Site URL, env config                      | Yes              |
| `backups/`            | Local backup snapshots                    | Off-site sync    |
| `logs/`               | PM2 logs                                  | Optional         |

## Security checklist

- [ ] HTTPS via reverse proxy.
- [ ] `NODE_ENV=production` so cookies set `Secure`.
- [ ] `SITE_URL` matches your real HTTPS origin.
- [ ] Firewall: only 22 / 80 / 443 exposed.
- [ ] SSH key auth only, no password login.
- [ ] Automatic OS updates (`unattended-upgrades` on Debian/Ubuntu).
- [ ] Backups are running and tested (do a dry restore quarterly).
- [ ] Uptime monitor pointed at `/api/health`.

## What's *not* in the box

- **No email** — the app deliberately requires no contact info. Password
  resets are via recovery phrase or security questions.
- **No CDN for images** — avatars are served by Node. Fine for a small
  blog. For large galleries you'd want a CDN in front.
- **No horizontal scaling** — single SQLite file, single Node process.
  For multi-region or high-write workloads, swap the DB.
