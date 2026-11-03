import express from "express";
import { pool } from "./db.ts";

export const app = express();

app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const { rows } = await pool.query("SELECT NOW()");
  res.json(rows[0]);
});

// ==========================================================================
// CRUD Players
// ==========================================================================
app.get("/api/players", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM players");
  res.json(rows);
});

app.get("/api/players/:id", async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: `invalid id: ${id}` });
  }
  const { rows } = await pool.query(
    "SELECT * FROM players WHERE player_id = $1",
    [id],
  );
  res.json(rows);
});

// ==========================================================================
// CRUD Matches
// ==========================================================================
app.get("/api/matches", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM matches");
  res.json(rows);
});

app.get("/api/matches/:id", async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: `invalid id: ${id}` });
  }
  const { rows } = await pool.query(
    "SELECT * FROM matches WHERE match_id = $1",
    [id],
  );
  res.json(rows);
});

// ==========================================================================
// CRUD Performances
// ==========================================================================
app.get("/api/performances", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM performances");
  res.json(rows);
});

app.get("/api/performances/:id", async (req, res) => {
  const id = req.params.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: `invalid id: ${id}` });
  }
  const { rows } = await pool.query(
    "SELECT * FROM performances WHERE id = $1",
    [id],
  );
  res.json(rows);
});
