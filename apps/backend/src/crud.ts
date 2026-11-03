import express from "express";
import { pool } from "./db";

/** Describes one table exposed through the CRUD router. */
type TableConfig = {
  table: string;
  idColumn: string;
  columns: string[];
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

/**
 * Builds list / read / create / update / delete routes for one table.
 * @param tableConfig - Table name, primary key and writable columns.
 * @returns Router to mount under `/api/<table>`.
 */
export function crudRouter(tableConfig: TableConfig) {
  const { table, idColumn, columns } = tableConfig;
  const router = express.Router();

  router.get("/", async (_req, res) => {
    const { rows } = await pool.query(`SELECT * from ${table}`);
    res.json(rows);
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
      VALUES = (${placeholders.join(", ")})
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
    const assignments = keys.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `UPDATE ${table} 
      SET (${assignments.join(", ")}) 
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
      `DELETE ${table} WHERE ${idColumn} = $1 `,
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
