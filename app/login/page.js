import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import AuthForm from "@/app/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in | Baking It Up" };

export default async function LoginPage({ searchParams }) {
  const { notice } = await searchParams;

  if (await getCurrentUser()) {
    redirect("/account");
  }

  return (
    <main className="auth-page">
      <h1>Welcome back</h1>
      {notice === "reset" && (
        <p className="auth-notice">Password updated. Log in with your new password.</p>
      )}
      {notice === "verified" && (
        <p className="auth-notice">Email confirmed. Log in to continue.</p>
      )}
      <AuthForm
        action={login}
        submitLabel="Log in"
        passwordAutoComplete="current-password"
      />
      <p className="auth-switch">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
      <p className="auth-switch">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </main>
  );
}
