"use server";

import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import {
  attemptKey,
  clearAttempts,
  clientIp,
  createSession,
  destroySession,
  hashPassword,
  isRateLimited,
  recordAttempts,
  verifyAgainstDummy,
  verifyPassword,
} from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMIT_ERROR = "Too many attempts. Please try again in 15 minutes.";
const INVALID_LOGIN_ERROR = "Incorrect email or password.";

function readCredentials(formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  return {
    email: typeof email === "string" ? email.trim().toLowerCase() : "",
    password: typeof password === "string" ? password : "",
  };
}

export async function register(_previousState, formData) {
  const { email, password } = readCredentials(formData);

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address.", email };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      email,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
      email,
    };
  }

  try {
    const ipKey = attemptKey("register", await clientIp());
    if (await isRateLimited([{ key: ipKey, max: 10 }])) {
      return { error: RATE_LIMIT_ERROR, email };
    }
    await recordAttempts([ipKey]);

    const sql = getSql();
    const passwordHash = await hashPassword(password);
    const rows = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;
    if (rows.length === 0) {
      return { error: "An account with this email already exists.", email };
    }
    await createSession(rows[0].id);
  } catch (error) {
    console.error("Registration failed:", error.message);
    return { error: GENERIC_ERROR, email };
  }

  redirect("/account");
}

export async function login(_previousState, formData) {
  const { email, password } = readCredentials(formData);

  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    return { error: INVALID_LOGIN_ERROR, email };
  }

  try {
    const ip = await clientIp();
    const pairKey = attemptKey("login", ip, email);
    const emailKey = attemptKey("login-email", email);
    const ipKey = attemptKey("login-ip", ip);
    const limited = await isRateLimited([
      { key: pairKey, max: 5 },
      { key: emailKey, max: 20 },
      { key: ipKey, max: 50 },
    ]);
    if (limited) {
      return { error: RATE_LIMIT_ERROR, email };
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, password_hash FROM users WHERE email = ${email}
    `;
    const user = rows[0];
    const passwordMatches = user
      ? await verifyPassword(user.password_hash, password)
      : await verifyAgainstDummy(password);

    if (!passwordMatches) {
      await recordAttempts([pairKey, emailKey, ipKey]);
      return { error: INVALID_LOGIN_ERROR, email };
    }

    await clearAttempts(pairKey);
    await createSession(user.id);
  } catch (error) {
    console.error("Login failed:", error.message);
    return { error: GENERIC_ERROR, email };
  }

  redirect("/account");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
