import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions/auth";
import AuthForm from "@/app/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create account | Baking It Up" };

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect("/account");
  }

  return (
    <main className="auth-page">
      <h1>Create your account</h1>
      <AuthForm
        action={register}
        submitLabel="Create account"
        passwordAutoComplete="new-password"
        passwordHint="Use at least 12 characters."
      />
      <p className="auth-switch">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
