import express from "express";
import { LIMIT_OPTIONS, DEFAULT_LIMIT } from "./constants.ts";
import { pool } from "./db.ts";

const searchColumn = "players.player_name";
const filterColumns: Record<string, string> = {
  team: "players.team",
  position: "players.position",
  stage: "matches.tournament_stage",
};
const sortColumns: Record<string, string> = {
  player_name: "players.player_name",
  team: "players.team",
  jersey_number: "players.jersey_number",
  position: "players.position",
  match_date: "matches.match_date",
  opponent_team: "performances.opponent_team",
  minutes_played: "performances.minutes_played",
  goals: "performances.goals",
  assists: "performances.assists",
  shots: "performances.shots",
  pass_accuracy: "performances.pass_accuracy",
  player_rating: "performances.player_rating",
};
const fromSql = `FROM performances
  JOIN players ON players.player_id = performances.player_id
  JOIN matches ON matches.match_id = performances.match_id`;

/**
 * Builds the router for the JOINed performance list (pagination, search, filter, sort)
 * @returns Router to mount under `/api/performances`.
 */
export function performancesRouter() {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const limitParam = Number(req.query.limit);
    const limit = LIMIT_OPTIONS.includes(limitParam)
      ? limitParam
      : DEFAULT_LIMIT;
    const pageParam = Number(req.query.page);
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q !== "") {
      const escaped = q.replace(/[\\%_]/g, "\\$&");
      params.push(`%${escaped}%`);
      where.push(`${searchColumn} ILIKE $${params.length}`);
    }

    for (const [key, column] of Object.entries(filterColumns)) {
      const raw = req.query[key];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (value !== "") {
        params.push(value);
        where.push(`${column} = $${params.length}`);
      }
    }

    const benchParam = Number(req.query.bench);
    if (benchParam !== 1) {
      where.push(`performances.minutes_played > 0`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const sortParam = req.query.sort;
    const sortColumn =
      typeof sortParam === "string" && Object.hasOwn(sortColumns, sortParam)
        ? sortColumns[sortParam]
        : "matches.match_date";

    const order = req.query.order === "asc" ? "ASC" : "DESC";
    const orderBySql = `ORDER BY ${sortColumn} ${order}, performances.id`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `
      SELECT 
        performances.id, 
        players.player_name, 
        players.team, 
        players.jersey_number,
        players.position,
        to_char(matches.match_date, 'YYYY-MM-DD') AS match_date,
        performances.opponent_team,
        performances.minutes_played,
        performances.goals,
        performances.assists,
        performances.shots,
        performances.pass_accuracy,
        performances.player_rating
      ${fromSql}
      ${whereSql} ${orderBySql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
        [...params, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) ${fromSql} ${whereSql}`, params),
    ]);

    const total = Number(countResult.rows[0].count);

    return res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });

  router.get("/:id", async (req, res) => {
    const idParam = Number(req.params.id);
    const id = Number.isInteger(idParam) ? idParam : 0;
    const { rows } = await pool.query(
      `
      SELECT
        pf.id,
        pl.player_name,
        pl.jersey_number,
        pl.position,
        pl.team,
        to_char(m.match_date, 'YYYY-MM-DD') AS match_date,
        m.stadium,
        opponent_team,
        match_result,
        goals_team,
        goals_opponent,
        minutes_played,
        goals,
        assists,
        shots,
        shots_on_target,
        expected_goals_xg,
        expected_assists_xa,
        key_passes,
        successful_passes,
        total_passes,
        pass_accuracy,
        dribbles_attempted,
        successful_dribbles,
        crosses,
        successful_crosses,
        tackles,
        interceptions,
        clearances,
        blocks,
        aerial_duels_won,
        aerial_duels_lost,
        recoveries,
        defensive_actions,
        fouls_committed,
        fouls_suffered,
        yellow_cards,
        red_cards,
        offsides,
        saves,
        save_percentage,
        punches,
        clean_sheet,
        goals_conceded,
        penalty_saves,
        distance_covered_km,
        sprint_distance_km,
        top_speed_kmh,
        accelerations,
        decelerations,
        stamina_score,
        player_rating,
        performance_score,
        offensive_contribution,
        defensive_contribution,
        possession_impact,
        pressure_resistance,
        creativity_score,
        consistency_score,
        clutch_performance_score
      FROM
        performances pf
        JOIN matches m ON m.match_id = pf.match_id
        JOIN players pl ON pl.player_id = pf.player_id
      WHERE
        pf.id = $1
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `performance ${id} not found` });
    }
    return res.json(rows[0]);
  });

  return router;
}
