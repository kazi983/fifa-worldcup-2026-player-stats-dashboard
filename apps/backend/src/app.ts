import express from "express";
import { pool } from "./db.ts";

export const app = express();

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const { rows } = await pool.query("select now()");
  res.json(rows[0]);
});
