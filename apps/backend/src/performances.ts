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

  return router;
}
