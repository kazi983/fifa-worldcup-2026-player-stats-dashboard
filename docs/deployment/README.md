# Deployment runbook (self-hosted VPS)

The demo runs on one Ubuntu 24.04 VPS with Docker Compose:
`caddy` (HTTPS) -> `frontend` (Astro SSR) -> `backend` (Express) -> `db`
(PostgreSQL). Only Caddy is reachable from the internet.

Prerequisites (done once, by hand): SSH key login only, ufw allowing
`OpenSSH`, `80/tcp`, `443/tcp`, Docker Engine and the Compose plugin from the
official Docker apt repository.

All commands below run **on the server** unless noted.

## Use tmux for long steps

Building the images (steps 3 and 5) takes several minutes. If the SSH
connection drops in the middle, the command stops with it. Run these steps
inside tmux: the session lives on the server and keeps running when the
connection drops.

```bash
sudo apt install -y tmux   # once, if `tmux -V` fails. -y: answer "yes" to the install prompt
tmux new -A -s deploy      # -s deploy: session name. -A: attach if "deploy" exists, otherwise create it
```

- Detach (leave it running): press `Ctrl+b`, release, then `d`
- Reattach after reconnecting: `tmux new -A -s deploy` again
- End the session: `exit` inside it

## 1. Give the server read access to the repository

Use a deploy key: an SSH key that can read this one repository and nothing
else. The server does not get your personal GitHub key.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "deploy@vps-e254caee" -N ""  # -t: key type. -f: key file path. -C: label stored in the public key. -N "": no passphrase
cat ~/.ssh/github_deploy.pub                                                     # print the public key to paste into GitHub
```

On GitHub: repository **Settings > Deploy keys > Add deploy key**, paste the
public key, leave **Allow write access** unchecked.

```bash
cat >> ~/.ssh/config <<'EOF'   # >>: append to the file (> would overwrite it). <<'EOF': heredoc; quoting EOF keeps $ from being expanded
Host github.com
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF
ssh -T git@github.com          # -T: do not open a terminal (GitHub has no shell). Expect "...successfully authenticated..."
```

The lines between `<<'EOF'` and `EOF` are written to `~/.ssh/config` as they
are, so they carry no comments: `IdentityFile` picks the deploy key, and
`IdentitiesOnly yes` stops `ssh` from also trying other keys.

## 2. Clone and configure

```bash
git clone git@github.com:kazi983/fifa-worldcup-2026-player-stats-dashboard.git ~/worldcup  # last argument: directory to clone into
cd ~/worldcup
cp .env.example .env                                                                   # copy the template
chmod 600 .env                                                                         # 600: only the owner can read and write
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env       # -i: edit the file in place. s/old/new/: replace the whole POSTGRES_PASSWORD= line. rand -hex 24: 24 random bytes as 48 hex characters
cat .env                                                                               # check SITE_HOST
```

`.env` holds the database password. It stays on the server and is never
committed.

## 3. Start the stack and load the data

```bash
tmux new -A -s deploy         # -s deploy: session name. -A: attach if it exists, otherwise create it
cd ~/worldcup
docker compose up -d --build  # -d: run in the background (detached). --build: build the images before starting
docker compose ps             # all services "running", db "healthy"
./deploy/reset-db.sh          # first data load (the db starts empty)
```

Open `https://<SITE_HOST>`. The first request can take a few seconds while
Caddy gets the certificate. If HTTPS fails, read `docker compose logs caddy`.

## 4. Nightly reset

Demo visitors can edit and delete data, so the database is rebuilt every
night. The server clock is UTC; 10:00 UTC is 02:00 or 03:00 in Vancouver.

```bash
crontab -e   # -e: edit the current user's cron table in a text editor
```

Add the two lines below. In a crontab, a comment must be on its own line.

```
# minute hour day month weekday command. >>: append the output to the log. 2>&1: send errors to the same log
0 10 * * * /home/ubuntu/worldcup/deploy/reset-db.sh >> /home/ubuntu/reset-db.log 2>&1
```

## 5. Deploy a new version

```bash
tmux new -A -s deploy         # attach to the "deploy" session, or create it
cd ~/worldcup
git pull                      # fetch the latest main and merge it
docker compose up -d --build  # -d: run in the background. --build: rebuild images that changed
```

Only containers whose image or config changed are recreated. The database
volume (`pgdata`) and the certificates (`caddy_data`) are kept.

## Troubleshooting

| Symptom                     | Check                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Site does not load          | `docker compose ps`, `docker compose logs caddy`                                                                           |
| Pages load but show no data | `docker compose logs backend frontend`                                                                                     |
| Form submit returns 403     | `SITE_HOST` in `.env` must match the URL; rebuild the frontend after changing it (`docker compose up -d --build frontend`) |
| Form submit returns 429     | Rate limit: 30 writes per 15 minutes per IP (`apps/frontend/src/middleware.ts`)                                            |
| Reset failed                | `tail /home/ubuntu/reset-db.log`                                                                                           |
| SSH dropped during a build  | Reconnect and run `tmux new -A -s deploy`; the build is still running in the session                                       |
