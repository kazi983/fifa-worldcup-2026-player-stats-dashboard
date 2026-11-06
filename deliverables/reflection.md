# What I built

I build a full-stack Player Performances Explorer for the FIFA World Cup 2026 dataset, using Astro on the front end, Express on the back end, and PostgreSQL through the `pg` Pool. The Performances page lists every player-match record. It uses server-side pagination with a rows-per-page selector, and you can search by player name, filter by team, position, and tournament stage, and sort by several columns. Clicking a row opens the Edit Performance page. It shows the player and match information and groups the stats into sections. There you can update the stats with a PATCH request or delete the record. The Rankings page shows the top 10 players by goals, assists, or average rating. It joins `players` and `performances` and aggregates with `COUNT` / `SUM` / `AVG` and `GROUP BY`. On the back end, a reusable CRUD router provides create, read, update, and delete endpoints for all three tables. Every value goes into the SQL as a parameterized query.

# How the data is normalized and why

The original CSV has one row per player per match, so player details (name, age, club, ...) are repeated in every match that player played, and match details are repeated for every player in that match. The setup script splits it into three tables. `players` has one row per player (`player_id` as the primary key) with personal attributes such as age, position, and club, plus tournament totals. `matches` has one row per match (`match_id`) with the date, stadium, city, and tournament stage. `performances` has one row per player per match. Its two foreign keys, `player_id` → `players` and `match_id` → `matches`, connect the other tables, and `UNIQUE (player_id, match_id)` prevents duplicate rows. It holds the per-match stats and resolves the many-to-many relationship between players and matches. Storing each fact only once means updating a player's club, for example, changes a single row instead of dozens.

However, the match result columns (`match_result`, `goals_team`, `goals_opponent`, `opponent_team`) still live in `performances`, so the same score is repeated for every player in a match. If I edited one performance, it could contradict the others. I would move them into `matches` as `home_team`, `away_team`, `home_score`, and `away_score`, and derive each player's result in the query by comparing `players.team` with the home or away team. That way the score is stored in one place, and the result no longer depends on whose perspective the row is written from.

# The challenges I hit

I tried to split the UI into reusable components so I would not repeat the
same markup. Rendering repeated elements was confusing at first. I started
with a `Record<string, string>`, which forced me to loop with
`Object.entries(...)`. I switched to a typed array:

```ts
type Column = {
  key: keyof Performance;
  label: string;
};
const COLUMNS: Column[] = [{ key: "player_name", label: "Player" }];
```

Now I can write `COLUMNS.map(({ key, label }) => ...)`, which is easier to
read, keeps the column order, and fails at compile time if a key is not a
real field of `Performance`.
