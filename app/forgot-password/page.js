import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import ActionForm from "@/app/components/ActionForm";

export const metadata = { title: "Reset password | Baking It Up" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <h1>Reset your password</h1>
      <ActionForm action={requestPasswordReset} submitLabel="Email me a reset link">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </ActionForm>
      <p className="auth-switch">
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
