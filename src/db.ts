import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  user: process.env.DB_USER || "admin",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "payment",
  password: process.env.DB_PASSWORD || "admin",
  port: parseInt(process.env.DB_PORT || "5432"),
});

export async function query(text: string, params?: any[]) {
  return await pool.query(text, params);
}