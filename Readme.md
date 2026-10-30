# Midterm — Player Performance Explorer

Build a full-stack app that imports a real dataset into PostgreSQL and lets a
user **browse, search, and manage** it. Individual work.

**Stack:** Astro (front end) · Node.js / Express (back end) · PostgreSQL via the
`pg` library (Pool connection).

## The dataset

You are given one flat CSV of football **player match performances** — each row
is *one player's stats in one match* (player info, match info, and performance
stats all mixed together).

## What to build

1. **Set up the database** — run the provided [`docs/setup_db.sql`](./docs/setup_db.sql),
   which imports the CSV and normalizes it into `players`, `matches`, and
   `performances` (see [Set up the database](#set-up-the-database) below).
2. **CRUD** — create, read, update, and delete records in your database.
3. **Paginated list page** — server-side pagination with a **rows-per-page
   selector** (e.g. 10 / 25 / 50 / 100) and page navigation.
4. **Detail view** — clicking a row opens a **detail page or modal** with that
   record's full information.
5. **Search / filter / sort** — on meaningful columns (e.g. name, position, team).
6. **At least one JOIN** across your tables and **one aggregate**
   (`COUNT` / `AVG` / `SUM` with `GROUP BY`) — e.g. a leaderboard or per-player totals.
7. **Safe queries** — use the `pg` Pool with **parameterized queries** (`$1`),
   never string concatenation (SQL injection).

## Set up the database

The schema is built for you. [`docs/setup_db.sql`](./docs/setup_db.sql) imports
the CSV and normalizes it into **3 related tables** — `players`, `matches`, and
`performances`. To run it:

1. Create a database and connect to it (in your shell):
   ```bash
   CREATE DATABASE worldcup
   psql -h localhost -U postgres -d worldcup
   ```
2. Inside `psql`, move into the `docs/` folder (it holds both the CSV and the
   script) and run it:
   ```
   \cd /path/to/wd-203-midterm-player-stats/docs
   \i setup_db.sql
   ```
3. Done — the script prints a row count and leaves you with three tables:

   | table | one row per… | key |
   |---|---|---|
   | `players` | player | `player_id` (PK) |
   | `matches` | match | `match_id` (PK) |
   | `performances` | player **in** a match (the stats) | FKs → `players`, `matches` |

**Read `setup_db.sql`** and make sure you understand *why* the data is split this
way — you'll join across these tables and explain the design in your reflection.

## Requirements checklist

- [ ] Database set up with `setup_db.sql` (players / matches / performances)
- [ ] Full CRUD
- [ ] Pagination + rows-per-page selector
- [ ] Detail page or modal
- [ ] Search / filter / sort
- [ ] At least one JOIN and one aggregate query
- [ ] Parameterized queries throughout

## Grading

- The requirements checklist above is the basis for your grade.
- You must **understand the database design** — your reflection must explain how
  the data is normalized (`players` / `matches` / `performances`) and why.
  "I just ran the script" is not enough.

## What we provide

Everything is in the [`docs/`](./docs) folder:

- **The dataset** — [`docs/fifa_world_cup_2026_player_performance.csv`](./docs/fifa_world_cup_2026_player_performance.csv)
- **The DB setup script** — [`docs/setup_db.sql`](./docs/setup_db.sql) (imports + normalizes the data)
- This README
- A **sample UI** for reference — you may tweak the design as you like

### Sample UI (in `docs/`)

- [`docs/player_performance.png`](./docs/player_performance.png) — list page (pagination, search, sort, "Add")
- [`docs/edit_performance.png`](./docs/edit_performance.png) — detail / edit / delete form
- [`docs/rankings.png`](./docs/rankings.png) — rankings (JOIN + aggregate)

> The mockups are **illustrative** — build against the **actual CSV columns**
> (some sample fields/labels won't match the dataset exactly).

## Notes

- **No hosting required** — the app only needs to run locally.
- Suggested order: run `setup_db.sql` → build & test endpoints in Postman → then
  build the Astro front end.

## Submission — `deliverables/` folder

Create a folder named **`deliverables/`** in the project root containing:

1. **`reflection.md`** — ~3 paragraphs: what you built, **how the data is
   normalized and why** (which columns live in which table, and the foreign keys),
   and the challenges you hit or what you'd improve.
2. **Normalization screenshot(s)** — your tables with **column headers clearly
   visible**, showing how the flat CSV was split (a DB GUI view or `\d`/query
   output is fine).
3. **UI screenshots** — each page of your app (list, detail, and any
   create/edit views).
