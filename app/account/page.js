import { redirect } from "next/navigation";
import { logout, resendVerification } from "@/app/actions/auth";
import { openBillingPortal } from "@/app/actions/billing";
import ActionForm from "@/app/components/ActionForm";
import AppNav from "@/app/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess, needsPaymentUpdate } from "@/lib/billing";

export const metadata = { title: "Your account | Baking It Up" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const status = user.subscription_status;
  const canManage =
    user.stripe_customer_id && (hasPaidAccess(status) || needsPaymentUpdate(status)) && status !== "comped";

  return (
    <main className="app-page">
      <AppNav current="/account" />
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

      <h2 className="account-heading">Subscription</h2>
      <p className="auth-switch">
        {status === "comped"
          ? "You have full access."
          : hasPaidAccess(status)
            ? "Your subscription is active."
            : needsPaymentUpdate(status)
              ? "Your last payment didn't go through."
              : "You don't have a subscription."}
      </p>
      {canManage && (
        <ActionForm
          action={openBillingPortal}
          submitLabel={needsPaymentUpdate(status) ? "Update payment details" : "Manage subscription"}
        />
      )}

      <form action={logout} className="auth-form auth-logout">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
