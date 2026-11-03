import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});
