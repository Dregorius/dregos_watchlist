# Watchlist

Private watchlist app for movies, series and games.

## Features

- Invite-only registration (accounts require an invitation code)
- Movie and series metadata via TMDB API (free)
- Game metadata via RAWG API (free, optional)
- Private and shared lists
- Personal ratings and status tracking
- Dark, responsive UI

## Requirements

- Docker and Docker Compose
- nginx with certbot on the server
- TMDB API key: https://www.themoviedb.org/settings/api
- RAWG API key (optional): https://rawg.io/apidocs

## Setup

### 1. Copy the project to the server

```bash
scp watchlist-app.zip <user>@<server>:~/
ssh <user>@<server>
cd ~/webserver
unzip ~/watchlist-app.zip
```

### 2. Configure environment variables

```bash
cd ~/webserver/watchlist-app
cp .env.example .env
nano .env
```

```
JWT_SECRET=<run: openssl rand -hex 32>
TMDB_API_KEY=<your TMDB key>
RAWG_API_KEY=<your RAWG key, optional>
DB_PATH=/app/data/watchlist.db
NODE_ENV=production
PORT=3000
```

### 3. Start the app

```bash
docker compose up -d --build
```

The first build takes about 2-3 minutes. Verify it is running:

```bash
curl http://127.0.0.1:3000/api/health
```

### 4. Obtain SSL certificate

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d watchlist.<your-domain>
```

### 5. Configure nginx

```bash
sudo cp nginx-subdomain.conf /etc/nginx/sites-available/watchlist
sudo ln -s /etc/nginx/sites-available/watchlist /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Create the first account

Open in browser: https://watchlist.<your-domain>/register

Invitation code: SETUP-ADMIN

The first registered user automatically receives admin rights and can
create further invitation codes in the admin panel.

## Administration

### Creating invitations

In the admin panel, click "Einladung erstellen". Copy the generated code
and send it to the person you want to invite.

### Updating the app

```bash
cd ~/webserver/watchlist-app
unzip -o ~/update-patch.zip -d ~/webserver/
docker compose up -d --build
```

### Backing up the database

```bash
cp ~/webserver/watchlist/watchlist.db \
   ~/backups/watchlist-$(date +%Y%m%d).db
```

### Stopping the app

```bash
docker compose down
```

## Local Development

```bash
# Backend
cd backend && npm install && node server.js

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:3000.

## Database

The SQLite database is stored outside the container at:

    ~/webserver/watchlist/watchlist.db

This directory is mounted as a Docker volume, so all data persists across
container restarts and app updates.

## Troubleshooting

Container does not start:
```bash
docker compose logs watchlist
```

Port 3000 already in use: change the port mapping in docker-compose.yml to
127.0.0.1:3001:3000 and update proxy_pass in nginx-subdomain.conf accordingly.

TMDB search returns nothing: check TMDB_API_KEY in .env, then restart the
container with "docker compose restart".

Cloudflare: set the SSL mode in the Cloudflare dashboard to "Full (strict)".
