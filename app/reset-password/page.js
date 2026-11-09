import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import ActionForm from "@/app/components/ActionForm";
import { isEmailTokenValid } from "@/lib/auth";

export const metadata = {
  title: "Choose a new password | Baking It Up",
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({ searchParams }) {
  const { token } = await searchParams;
  const valid =
    typeof token === "string" && (await isEmailTokenValid(token, "reset_password"));

  if (!valid) {
    return (
      <main className="auth-page">
        <h1>This link has expired</h1>
        <p className="auth-switch">
          Reset links work once and last an hour.{" "}
          <Link href="/forgot-password">Request a new one</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1>Choose a new password</h1>
      <ActionForm action={resetPassword} submitLabel="Save new password">
        <input type="hidden" name="token" value={token} />
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="auth-hint">Use at least 12 characters.</p>
      </ActionForm>
    </main>
  );
}
