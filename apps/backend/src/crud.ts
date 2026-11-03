import express from "express";
import { pool } from "./db.ts";

/** Describes one table exposed through the CRUD router. */
type TableConfig = {
  table: string;
  idColumn: string;
  columns: string[];
  searchColumns?: string[];
  filterColumns?: string[];
  sortColumns?: string[];
};

/**
 * Picks the allowed columns that appears in the request body.
 * @param body - Parsed json body
 * @param columns - Allowed column names.
 * @returns Column names and their values, in the same order.
 */
function pickColumns(body: unknown, columns: string[]) {
  const data =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const keys = columns.filter((column) => column in data);
  const values = keys.map((key) => data[key]);
  return { keys, values };
}

const LIMIT_OPTIONS = [10, 25, 50, 100];
const DEFAULT_LIMIT = 25;

/**
 * Builds list / read / create / update / delete routes for one table.
 * @param tableConfig - Table name, primary key and writable columns.
 * @returns Router to mount under `/api/<table>`.
 */
export function crudRouter(tableConfig: TableConfig) {
  const {
    table,
    idColumn,
    columns,
    searchColumns = [],
    filterColumns = [],
    sortColumns = [],
  } = tableConfig;
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
    if (typeof req.query.q === "string" && searchColumns.length > 0) {
      params.push(`%${req.query.q}%`);
      where.push(
        `(${searchColumns?.map((c) => `${c} ILIKE $${params.length}`).join(" OR ")})`,
      );
    }

    for (const column of filterColumns) {
      const value = req.query[column];
      if (typeof value === "string") {
        params.push(value);
        where.push(`${column} = $${params.length}`);
      }
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const sortParam = req.query.sort;
    const sortColumn =
      typeof sortParam === "string" && sortColumns.includes(sortParam)
        ? sortParam
        : idColumn;
    const order = req.query.order === "desc" ? "DESC" : "ASC";
    const orderBySql =
      sortColumn === idColumn
        ? `ORDER BY ${idColumn} ${order}`
        : `ORDER BY ${sortColumn} ${order}, ${idColumn}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT * from ${table} ${whereSql} ${orderBySql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
      pool.query(`SELECT COUNT(*) FROM ${table} ${whereSql}`, params),
    ]);

    const total = Number(countResult.rows[0].count);

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });

  router.get("/:id", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * from ${table} WHERE ${idColumn} = $1`,
      [req.params.id],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: `${table} ${req.params.id} not found` });
    }
    res.json(rows[0]);
  });

  router.post("/", async (req, res) => {
    const { keys, values } = pickColumns(req.body, columns);
    if (keys.length === 0) {
      return res.status(400).json({ error: "no valid columns in body" });
    }
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${keys.join(", ")}) 
      VALUES (${placeholders.join(", ")})
      RETURNING *`,
      values,
    );
    res.status(201).json(rows[0]);
  });

  router.patch("/:id", async (req, res) => {
    const { keys, values } = pickColumns(
      req.body,
      columns.filter((column) => column !== idColumn),
    );
    if (keys.length === 0) {
      return res.status(400).json({ error: "no valid columns in body" });
    }
    const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
    const { rows } = await pool.query(
      `UPDATE ${table} 
      SET ${assignments.join(", ")} 
      WHERE ${idColumn} = $${keys.length + 1}
      RETURNING *`,
      [...values, req.params.id],
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: `${table} ${req.params.id} not found` });
    }
    res.json(rows[0]);
  });

  router.delete("/:id", async (req, res) => {
    const { rowCount } = await pool.query(
      `DELETE FROM ${table} WHERE ${idColumn} = $1 `,
      [req.params.id],
    );
    if (rowCount === 0) {
      return res
        .status(404)
        .json({ error: `${table} ${req.params.id} not found` });
    }
    res.status(204).end();
  });

  return router;
}
