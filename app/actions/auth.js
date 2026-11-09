"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSql } from "@/lib/db";
import {
  attemptKey,
  clearAttempts,
  clientIp,
  confirmEmailWithToken,
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  isEmailTokenValid,
  isRateLimited,
  issueEmailToken,
  recordAttempts,
  resetPasswordWithToken,
  verifyAgainstDummy,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR = "Something went wrong. Please try again.";
const RATE_LIMIT_ERROR = "Too many attempts. Please try again in 15 minutes.";
const INVALID_LOGIN_ERROR = "Incorrect email or password.";
const EXPIRED_LINK_ERROR = "This link has expired. Please request a new one.";

const VERIFY_LINK_MINUTES = 24 * 60;
const RESET_LINK_MINUTES = 60;

function passwordError(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

async function sendVerification(userId, email) {
  try {
    const token = await issueEmailToken(userId, "verify_email", VERIFY_LINK_MINUTES);
    await sendVerificationEmail(email, token);
  } catch (error) {
    console.error("Verification email failed:", error.message);
  }
}

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
  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { error: invalidPassword, email };
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
    const userId = rows[0].id;
    after(() => sendVerification(userId, email));
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

export async function resendVerification() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.email_verified) {
    return { message: "Your email is already confirmed." };
  }

  try {
    const key = attemptKey("resend-verification", user.id);
    if (await isRateLimited([{ key, max: 3 }])) {
      return { error: RATE_LIMIT_ERROR };
    }
    await recordAttempts([key]);
  } catch (error) {
    console.error("Resend verification failed:", error.message);
    return { error: GENERIC_ERROR };
  }

  after(() => sendVerification(user.id, user.email));
  return { message: "Confirmation email sent. Check your inbox." };
}

export async function confirmEmail(_previousState, formData) {
  const token = formData.get("token");
  if (typeof token !== "string") {
    return { error: EXPIRED_LINK_ERROR };
  }

  try {
    if (!(await confirmEmailWithToken(token))) {
      return { error: EXPIRED_LINK_ERROR };
    }
  } catch (error) {
    console.error("Email confirmation failed:", error.message);
    return { error: GENERIC_ERROR };
  }

  redirect("/login?notice=verified");
}

export async function requestPasswordReset(_previousState, formData) {
  const { email } = readCredentials(formData);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const ip = await clientIp();

  // Runs after the response so its timing can't reveal whether the account exists.
  after(async () => {
    try {
      const ipKey = attemptKey("reset-ip", ip);
      const emailKey = attemptKey("reset-email", email);
      const limited = await isRateLimited([
        { key: ipKey, max: 10 },
        { key: emailKey, max: 3 },
      ]);
      if (limited) {
        return;
      }
      await recordAttempts([ipKey, emailKey]);

      const sql = getSql();
      const rows = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (rows.length > 0) {
        const token = await issueEmailToken(rows[0].id, "reset_password", RESET_LINK_MINUTES);
        await sendPasswordResetEmail(email, token);
      }
    } catch (error) {
      console.error("Password reset email failed:", error.message);
    }
  });

  return { message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPassword(_previousState, formData) {
  const token = formData.get("token");
  const { password } = readCredentials(formData);
  if (typeof token !== "string") {
    return { error: EXPIRED_LINK_ERROR };
  }

  const invalidPassword = passwordError(password);
  if (invalidPassword) {
    return { error: invalidPassword };
  }

  try {
    if (!(await isEmailTokenValid(token, "reset_password"))) {
      return { error: EXPIRED_LINK_ERROR };
    }
    const email = await resetPasswordWithToken(token, await hashPassword(password));
    if (!email) {
      return { error: EXPIRED_LINK_ERROR };
    }
    await clearAttempts(attemptKey("login", await clientIp(), email));
    await clearAttempts(attemptKey("login-email", email));
    await destroySession();
  } catch (error) {
    console.error("Password reset failed:", error.message);
    return { error: GENERIC_ERROR };
  }

  redirect("/login?notice=reset");
}
