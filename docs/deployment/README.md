# Deployment runbook (self-hosted VPS)

The demo runs on one Ubuntu 24.04 VPS with Docker Compose:
`caddy` (HTTPS) -> `frontend` (Astro SSR) -> `backend` (Express) -> `db`
(PostgreSQL). Only Caddy is reachable from the internet.

Prerequisites (done once, by hand): SSH key login only, ufw allowing
`OpenSSH`, `80/tcp`, `443/tcp`, Docker Engine and the Compose plugin from the
official Docker apt repository.

All commands below run **on the server** unless noted.

## 1. Give the server read access to the repository

Use a deploy key: an SSH key that can read this one repository and nothing
else. The server does not get your personal GitHub key.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "deploy@vps-e254caee" -N ""
cat ~/.ssh/github_deploy.pub
```

On GitHub: repository **Settings > Deploy keys > Add deploy key**, paste the
public key, leave **Allow write access** unchecked.

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
    IdentityFile ~/.ssh/github_deploy
    IdentitiesOnly yes
EOF
ssh -T git@github.com   # "...successfully authenticated..." is expected
```

## 2. Clone and configure

```bash
git clone git@github.com:kazi983/fifa-worldcup-2026-player-stats-dashboard.git ~/app
cd ~/app
cp .env.example .env
chmod 600 .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
cat .env   # check SITE_HOST
```

`.env` holds the database password. It stays on the server and is never
committed.

## 3. Start the stack and load the data

```bash
docker compose up -d --build
docker compose ps            # all services "running", db "healthy"
./deploy/reset-db.sh         # first data load (the db starts empty)
```

Open `https://<SITE_HOST>`. The first request can take a few seconds while
Caddy gets the certificate. If HTTPS fails, read `docker compose logs caddy`.

## 4. Nightly reset

Demo visitors can edit and delete data, so the database is rebuilt every
night. The server clock is UTC; 10:00 UTC is 02:00 or 03:00 in Vancouver.

```bash
crontab -e
```

Add:

```
0 10 * * * /home/ubuntu/app/deploy/reset-db.sh >> /home/ubuntu/reset-db.log 2>&1
```

## 5. Deploy a new version

```bash
cd ~/app
git pull
docker compose up -d --build
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
