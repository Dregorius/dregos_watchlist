# Drego's Watchlist

Private self-hosted watchlist app for movies, series, anime and games.
Use solo or share lists between friends.

<img width="2525" height="1253" alt="image" src="https://github.com/user-attachments/assets/d79a7f93-7ed7-4083-99bf-b0e1ee72bc85" />

<img width="184" height="331" alt="image" src="https://github.com/user-attachments/assets/3473fb7c-b005-43b7-aa51-07812e107775" />


## Features

- Invite-only registration (accounts require an invitation code, no public sign-up)
- Movie and series metadata via TMDB API (free)
- Game metadata via RAWG API (free, optional)
- Anime support with MyAnimeList integration
- Private and shared lists with configurable edit permissions
- Custom categories for organizing lists, with drag and drop reordering
- Personal star ratings (1-10) and watch status per entry
- Random picker that respects active filters
- Direct links to Letterboxd, TMDB, MAL or RAWG per entry
- Letterboxd recently watched widget on the dashboard (with posters)
- MyAnimeList recently watched widget on the dashboard (last 3 entries)
- IMDb profile and watchlist link widget
- Admin panel with invite management and member overview
- Dark, responsive UI

## Requirements

- Docker and Docker Compose
- TMDB API key: https://www.themoviedb.org/settings/api
- RAWG API key (optional, for game search): https://rawg.io/apidocs

## Setup

### 1. Configure environment variables

```bash
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

### 2. Configure the database volume

In `docker-compose.yml`, set the volume to a path outside the container:

```yaml
volumes:
  - /your/path/to/data:/app/data
```

This ensures your database survives container rebuilds and updates.

### 3. Start the app

```bash
docker compose up -d --build
```

The first build takes about 2-3 minutes. Verify it is running:

```bash
curl http://127.0.0.1:3000/api/health
```

### 4. Create the first account

Open in browser: http://localhost:3000/register

Invitation code: SETUP-ADMIN

The first registered user automatically receives admin rights and can create
further invitation codes in the admin panel.

## Updating

```bash
unzip -o update-patch.zip -d ./
docker compose up -d --build
```

## Backing up

```bash
cp /your/path/to/data/watchlist.db ./watchlist-$(date +%Y%m%d).db
```

## Usage

### Lists

Create lists from the dashboard. Each list has a type (Movies & Series, Anime,
or Games) which restricts what can be added and shows the appropriate external
links per entry.

Set a category when creating a list to group related lists on the dashboard.
Category names can be edited inline by clicking the category heading.

Lists can be private (visible only to you) or shared with specific users.
Shared users can be given read-only or edit access.

### Adding content

Inside a list, click "+ Hinzufügen" to search for movies, series, anime or
games. Results pull metadata from TMDB and RAWG automatically.

Each entry tracks:
- Status: Watchlist / Watching / Completed / Dropped (or game equivalents)
- Personal star rating (1-10)
- External link: Letterboxd (movies), TMDB (series), MAL (anime), RAWG (games)

### Random picker

Inside a list, click the dice button to pick a random entry. The picker
respects the currently active status and type filters.

### Dashboard widgets

Link your external profiles via the navbar: click your username, then
"Profil bearbeiten".

- Letterboxd: shows your recently logged films with posters
- MyAnimeList: shows your last 3 recently watched anime with posters
- IMDb: links to your IMDb profile and watchlist

Widgets appear on the right side of the dashboard on wide screens and
below the lists on narrow screens.

### Admin panel

Accessible via the navbar if you have admin rights. From here you can create
and delete invitation codes, and see all registered members with their stats.

## Troubleshooting

Container does not start:
```bash
docker compose logs watchlist
```

TMDB search returns nothing: check TMDB_API_KEY in .env, then run:
```bash
docker compose restart
```

MAL widget shows no posters: Jikan (the MAL API) rate limits requests to
3 per second. The widget fetches posters one by one with a 500ms delay,
so loading takes a couple of seconds.

Letterboxd widget shows no posters: the TMDB API key is used to fetch
posters for Letterboxd entries. Check that TMDB_API_KEY is set correctly.
