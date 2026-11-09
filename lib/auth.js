import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { hash, verify } from "@node-rs/argon2";
import { getSql } from "@/lib/db";

const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

// Argon2id with OWASP's recommended minimum cost.
const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPassword(password) {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash, password) {
  return verify(passwordHash, password);
}

let dummyHash;

// Burns the same time as a real check so response time can't reveal which emails exist.
export async function verifyAgainstDummy(password) {
  dummyHash ??= await hashPassword(randomBytes(32).toString("hex"));
  await verify(dummyHash, password);
  return false;
}

export async function createSession(userId) {
  const sql = getSql();
  // Only the hash is stored, so a database leak can't be replayed as live sessions.
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${sha256(token)}, ${userId}, ${expires.toISOString()})
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const sql = getSql();
    await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const sql = getSql();
  const rows = await sql`
    SELECT users.id, users.email, users.email_verified_at IS NOT NULL AS email_verified,
      users.stripe_customer_id, users.subscription_status
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${sha256(token)} AND sessions.expires_at > now()
  `;
  return rows[0] ?? null;
});

export async function clientIp() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export function attemptKey(...parts) {
  return sha256(parts.join(":"));
}

// limits: [{ key, max }], counted over the last 15 minutes.
export async function isRateLimited(limits) {
  const sql = getSql();
  const rows = await sql`
    SELECT key, count(*) AS attempts
    FROM auth_attempts
    WHERE key = ANY(${limits.map((limit) => limit.key)})
      AND attempted_at > now() - interval '15 minutes'
    GROUP BY key
  `;
  return rows.some(
    (row) =>
      Number(row.attempts) >= limits.find((limit) => limit.key === row.key).max,
  );
}

export async function recordAttempts(keys) {
  const sql = getSql();
  await sql`INSERT INTO auth_attempts (key) SELECT unnest(${keys}::text[])`;
  await sql`DELETE FROM auth_attempts WHERE attempted_at < now() - interval '1 day'`;
}

export async function clearAttempts(key) {
  const sql = getSql();
  await sql`DELETE FROM auth_attempts WHERE key = ${key}`;
}

// Email links are single use and, like sessions, only their hashes are stored.
export async function issueEmailToken(userId, purpose, minutes) {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + minutes * 60 * 1000);

  await sql`
    DELETE FROM email_tokens
    WHERE expires_at < now() OR (user_id = ${userId} AND purpose = ${purpose})
  `;
  await sql`
    INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at)
    VALUES (${sha256(token)}, ${userId}, ${purpose}, ${expires.toISOString()})
  `;
  return token;
}

export async function isEmailTokenValid(token, purpose) {
  const sql = getSql();
  const rows = await sql`
    SELECT 1 FROM email_tokens
    WHERE token_hash = ${sha256(token)} AND purpose = ${purpose} AND expires_at > now()
  `;
  return rows.length > 0;
}

export async function confirmEmailWithToken(token) {
  const sql = getSql();
  const rows = await sql`
    WITH consumed AS (
      DELETE FROM email_tokens
      WHERE token_hash = ${sha256(token)} AND purpose = 'verify_email' AND expires_at > now()
      RETURNING user_id
    )
    UPDATE users SET email_verified_at = COALESCE(email_verified_at, now())
    FROM consumed
    WHERE users.id = consumed.user_id
    RETURNING users.id
  `;
  return rows.length > 0;
}

// One statement, so the link is spent and every session ends with the password change.
export async function resetPasswordWithToken(token, passwordHash) {
  const sql = getSql();
  const rows = await sql`
    WITH consumed AS (
      DELETE FROM email_tokens
      WHERE token_hash = ${sha256(token)} AND purpose = 'reset_password' AND expires_at > now()
      RETURNING user_id
    ), updated AS (
      UPDATE users
      SET password_hash = ${passwordHash}, email_verified_at = COALESCE(email_verified_at, now())
      FROM consumed
      WHERE users.id = consumed.user_id
      RETURNING users.id, users.email
    ), ended_sessions AS (
      DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated)
    )
    SELECT email FROM updated
  `;
  return rows[0]?.email ?? null;
}
