# Deploying ronanhevenor.com

This is a Next.js 16 app with a file-based admin (`/ronan`) that writes to
`data/*.json` and `public/gallery/`. Those files are gitignored — on a real
server they live on disk, survive deploys, and back up separately from the
code.

Target: a single Linux VPS (Ubuntu 22.04+ / Debian 12 assumed) running Node.js
behind a reverse proxy that terminates TLS.

---

## 1. One-time server setup

```bash
# Node 22 (via nvm, or a distro package / nodesource repo)
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm use 22

# pnpm
npm i -g pnpm

# app user (optional but recommended — don't run Next.js as root)
sudo adduser --system --group --home /srv/ronanhevenor ronan
sudo mkdir -p /srv/ronanhevenor && sudo chown ronan:ronan /srv/ronanhevenor
```

## 2. Clone and build

```bash
sudo -iu ronan
cd /srv/ronanhevenor
git clone https://github.com/<you>/ronanhevenor.com.git app
cd app
pnpm install --frozen-lockfile
pnpm build
```

## 3. Secrets

Generate `AUTH_SECRET` and a PBKDF2 hash of your admin password. **Do this
once**, store the output somewhere safe (a password manager), and put the
values in `/srv/ronanhevenor/app/.env.local`:

```bash
# AUTH_SECRET — 32 random bytes as hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD_HASH — replace YOUR_STRONG_PASSWORD first
node -e "const c=require('crypto');const p='YOUR_STRONG_PASSWORD';const s=c.randomBytes(16);const i=600000;const h=c.pbkdf2Sync(p,s,i,32,'sha256');console.log('pbkdf2\$'+i+'\$'+s.toString('hex')+'\$'+h.toString('hex'))"
```

Write:

```ini
# /srv/ronanhevenor/app/.env.local
AUTH_SECRET=<hex from above>
ADMIN_PASSWORD_HASH=<pbkdf2 string from above>
NODE_ENV=production
```

`chmod 600 .env.local` so only the app user can read it.

## 4. systemd service

Create `/etc/systemd/system/ronanhevenor.service`:

```ini
[Unit]
Description=ronanhevenor.com (Next.js)
After=network.target

[Service]
Type=simple
User=ronan
Group=ronan
WorkingDirectory=/srv/ronanhevenor/app
Environment=PORT=3000
EnvironmentFile=/srv/ronanhevenor/app/.env.local
ExecStart=/home/ronan/.nvm/versions/node/v22/bin/pnpm start
Restart=on-failure
RestartSec=3

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/srv/ronanhevenor/app/data /srv/ronanhevenor/app/public/gallery /srv/ronanhevenor/app/.next
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

(Adjust `ExecStart` to match your actual node/pnpm path — `which pnpm` as the
`ronan` user.)

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ronanhevenor
sudo systemctl status ronanhevenor
journalctl -u ronanhevenor -f
```

## 5. Reverse proxy + TLS (caddy)

Caddy is the shortest path to auto-HTTPS. Install, then drop this into
`/etc/caddy/Caddyfile`:

```caddy
ronanhevenor.com, www.ronanhevenor.com {
    encode zstd gzip

    # Long-cache the image gallery (content is immutable once uploaded).
    @gallery path /gallery/*
    header @gallery Cache-Control "public, max-age=31536000, immutable"

    reverse_proxy 127.0.0.1:3000
}
```

Reload: `sudo systemctl reload caddy`. Caddy provisions Let's Encrypt certs
automatically on first request.

If you prefer nginx: proxy to `127.0.0.1:3000`, terminate TLS with certbot,
set `proxy_set_header Host $host;` and `X-Forwarded-For $remote_addr;` so the
login rate limiter sees real client IPs.

## 6. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Port 3000 stays bound to `127.0.0.1` only — don't expose it publicly.

## 7. First-run admin setup

1. Visit `https://ronanhevenor.com/ronan` → you'll be redirected to `/ronan/login`.
2. Enter the password you hashed in step 3.
3. In the **sections** tab, write markdown for "What I do" and "Who I am".
4. In **photos**, upload your gallery.
5. In **posts**, publish a first post.

Uploads land in `public/gallery/`; section/post content lands in `data/*.json`.

## 8. Backups

The tracked repo is disposable — it contains no user content. What you need to
back up:

- `/srv/ronanhevenor/app/data/*.json` (photos/posts/sections metadata)
- `/srv/ronanhevenor/app/public/gallery/` (the actual image files)
- `/srv/ronanhevenor/app/.env.local` (one-time secret — if lost, generate new)

Cron-friendly one-liner:

```bash
tar -czf /backups/ronanhevenor-$(date +%F).tgz \
  -C /srv/ronanhevenor/app data public/gallery .env.local
```

Rotate offsite (rsync to another host, rclone to S3/B2, etc.).

## 9. Updates

```bash
sudo -iu ronan
cd /srv/ronanhevenor/app
git pull
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart ronanhevenor
```

Because `data/` and `public/gallery/` are gitignored, `git pull` never
touches your content.

## 10. Rotating the admin password

Generate a new `ADMIN_PASSWORD_HASH` (step 3), replace the line in
`.env.local`, then `sudo systemctl restart ronanhevenor`. Existing signed
sessions stay valid until their 7-day expiry unless you also rotate
`AUTH_SECRET` — rotate both if you suspect compromise.

## Troubleshooting

- **`/ronan` returns 503 "AUTH_SECRET not configured"** — the env var isn't
  loaded. Check `.env.local` path in the service file and restart.
- **Login says "too many attempts"** — in-memory rate limit. It's per-IP for
  15 min; it resets on service restart too.
- **Rate limit sees `unknown` instead of real IPs** — your reverse proxy
  isn't forwarding `X-Forwarded-For` or `X-Real-IP`. Configure it.
- **Uploads succeed but images 404** — the systemd `ReadWritePaths` line
  must include `/srv/ronanhevenor/app/public/gallery`.
