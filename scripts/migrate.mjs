import { neon } from "@neondatabase/serverless";

// Runs before every build. Statements must stay additive and safe to repeat.
const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS auth_attempts (
    key text NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS auth_attempts_key_idx ON auth_attempts (key, attempted_at)`,
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("DATABASE_URL is not set; skipping database migration.");
  process.exit(0);
}

const sql = neon(url);
for (const statement of statements) {
  await sql.query(statement);
}
console.log("Database migration complete.");
