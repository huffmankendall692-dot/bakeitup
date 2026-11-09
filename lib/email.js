import "server-only";

export function appUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  // Links never come from the request's Host header, which a client can forge.
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Resend responded with ${response.status}`);
  }
}

export function sendVerificationEmail(to, token) {
  const link = `${appUrl()}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Confirm your email for Baking It Up",
    text: `Confirm your email address by opening this link:\n\n${link}\n\nThe link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
  });
}

export function sendPasswordResetEmail(to, token) {
  const link = `${appUrl()}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Reset your Baking It Up password",
    text: `Choose a new password by opening this link:\n\n${link}\n\nThe link expires in 1 hour. If you didn't ask for this, you can ignore this email and your password will stay the same.`,
  });
}
