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
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz`,
  `CREATE TABLE IF NOT EXISTS email_tokens (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS email_tokens_user_id_idx ON email_tokens (user_id)`,
  // Shared demo login. Reapplied on every build so its known password keeps working.
  `INSERT INTO users (email, password_hash, email_verified_at)
    VALUES ('demo@demo.com', '$argon2id$v=19$m=19456,t=2,p=1$JsaFBytF52b3E9W09RDKPA$G2FZYExFC4EP1aiU5382AzyaymDwvwwkI3yYKvzCv/0', now())
    ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
      email_verified_at = COALESCE(users.email_verified_at, now())`,
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
