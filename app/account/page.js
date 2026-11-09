import { redirect } from "next/navigation";
import { logout, resendVerification } from "@/app/actions/auth";
import { openBillingPortal, startCheckout } from "@/app/actions/billing";
import ActionForm from "@/app/components/ActionForm";
import RecipeGenerator from "@/app/components/RecipeGenerator";
import { MAX_INGREDIENTS_LENGTH } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess, needsPaymentUpdate, syncSubscription } from "@/lib/billing";

export const metadata = { title: "Your account | Baking It Up" };

export default async function AccountPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { checkout } = await searchParams;
  let subscriptionStatus = user.subscription_status;

  // Returning from checkout can beat Stripe's webhook, so check directly.
  if (checkout === "success" && !hasPaidAccess(subscriptionStatus) && user.stripe_customer_id) {
    try {
      subscriptionStatus = await syncSubscription(user.stripe_customer_id);
    } catch (error) {
      console.error("Subscription check failed:", error.message);
    }
  }
  const paid = hasPaidAccess(subscriptionStatus);

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

      {checkout === "success" && (
        <p className="auth-notice">
          {paid
            ? "Thanks for subscribing! The recipe generator is ready."
            : "We're still confirming your payment. Refresh this page in a moment."}
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="auth-notice">Checkout cancelled. You haven't been charged.</p>
      )}

      {paid && <RecipeGenerator maxLength={MAX_INGREDIENTS_LENGTH} />}
      {needsPaymentUpdate(subscriptionStatus) && (
        <section className="recipe-generator">
          <h2>Your last payment didn't go through</h2>
          <p className="auth-switch">Update your card to unlock the recipe generator again.</p>
          <ActionForm action={openBillingPortal} submitLabel="Update payment details" />
        </section>
      )}
      {!paid && !needsPaymentUpdate(subscriptionStatus) && (
        <section className="recipe-generator">
          <h2>Unlock the recipe generator</h2>
          <p className="auth-switch">
            Turn what's left in your kitchen into recipes with amounts that adjust and timers
            built in. $20 a month, cancel anytime.
          </p>
          <ActionForm action={startCheckout} submitLabel="Subscribe for $20/month" />
        </section>
      )}

      {paid && subscriptionStatus !== "comped" && user.stripe_customer_id && (
        <ActionForm action={openBillingPortal} submitLabel="Manage subscription" />
      )}
      <form action={logout} className="auth-form auth-logout">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
