import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import AuthForm from "@/app/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Log in | Baking It Up" };

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/account");
  }

  return (
    <main className="auth-page">
      <h1>Welcome back</h1>
      <AuthForm
        action={login}
        submitLabel="Log in"
        passwordAutoComplete="current-password"
      />
      <p className="auth-switch">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </main>
  );
}
