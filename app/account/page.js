import { redirect } from "next/navigation";
import { logout, resendVerification } from "@/app/actions/auth";
import ActionForm from "@/app/components/ActionForm";
import RecipeGenerator from "@/app/components/RecipeGenerator";
import { MAX_INGREDIENTS_LENGTH } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Your account | Baking It Up" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="auth-page">
      <h1>Your account</h1>
      <p className="auth-switch">Logged in as {user.email}</p>
      {user.email_verified ? (
        <p className="auth-notice">Your email is confirmed.</p>
      ) : (
        <>
          <p className="auth-hint">Your email isn't confirmed yet. Check your inbox.</p>
          <ActionForm action={resendVerification} submitLabel="Resend confirmation email" />
        </>
      )}
      <RecipeGenerator maxLength={MAX_INGREDIENTS_LENGTH} />
      <form action={logout} className="auth-form">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
