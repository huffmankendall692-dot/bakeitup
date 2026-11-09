import Link from "next/link";
import { confirmEmail } from "@/app/actions/auth";
import ActionForm from "@/app/components/ActionForm";
import { isEmailTokenValid } from "@/lib/auth";

export const metadata = {
  title: "Confirm your email | Baking It Up",
  referrer: "no-referrer",
};

// Confirming takes a button press because mail scanners open links automatically.
export default async function VerifyEmailPage({ searchParams }) {
  const { token } = await searchParams;
  const valid =
    typeof token === "string" && (await isEmailTokenValid(token, "verify_email"));

  if (!valid) {
    return (
      <main className="auth-page">
        <h1>This link has expired</h1>
        <p className="auth-switch">
          Log in to your <Link href="/account">account</Link> to send a new one.
        </p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1>Confirm your email</h1>
      <ActionForm action={confirmEmail} submitLabel="Confirm email">
        <input type="hidden" name="token" value={token} />
      </ActionForm>
    </main>
  );
}
