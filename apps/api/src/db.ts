import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured on the API server.");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const ensureDatabaseSchema = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE chat_messages
      ADD COLUMN IF NOT EXISTS metadata JSONB;

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
      ON chat_messages(session_id, created_at, id);
  `);
};
