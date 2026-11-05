import express from "express";
import { pool } from "./db.ts";

const SORT_OPTIONS = ["goals", "assists", "player_rating"];

/**
 * Builds the router for the JOINed ranking list
 * @returns Router to mount under `/api/rankings`.
 */
export function rankingsRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const sortParam = String(req.query.sort);
    const sort = SORT_OPTIONS.includes(sortParam) ? sortParam : "goals";

    const { rows } = await pool.query(
      `WITH player_stats AS (
        SELECT
          pl.player_id,
          pl.player_name,
          pl.team,
          COUNT(
            CASE
              WHEN pf.minutes_played > 0 THEN 1
            END
          )::int AS matches_played,
          SUM(pf.goals)::int AS goals,
          SUM(pf.assists)::int AS assists,
          ROUND(
            AVG (
              CASE
                WHEN pf.minutes_played > 0 THEN pf.player_rating
              END
            ),
            2
          )::float8 AS player_rating
        FROM
          players pl
          JOIN performances pf ON pf.player_id = pl.player_id
        GROUP BY
          pl.player_id
      ),
      ranked_players AS (
        SELECT
          RANK() OVER (ORDER BY ${sort} DESC NULLS LAST)::int AS rank,
          player_stats.*
        FROM
          player_stats
      )
      SELECT
        ranked_players.*
      FROM 
        ranked_players
      WHERE
        rank <= 10
      ORDER BY
        ${sort} DESC NULLS LAST,
        player_id
        `,
    );

    return res.json(rows);
  });

  return router;
}
