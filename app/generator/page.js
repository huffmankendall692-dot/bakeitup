import { redirect } from "next/navigation";
import { startCheckout } from "@/app/actions/billing";
import ActionForm from "@/app/components/ActionForm";
import AppNav from "@/app/components/AppNav";
import RecipeGenerator from "@/app/components/RecipeGenerator";
import { MAX_INGREDIENTS_LENGTH } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess, needsPaymentUpdate, syncSubscription } from "@/lib/billing";

export const metadata = { title: "Recipe generator | Baking It Up" };

export default async function GeneratorPage({ searchParams }) {
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
    <main className="app-page">
      <AppNav current="/generator" />
      <h1>Recipe generator</h1>

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
          <p className="auth-switch">
            Update your card on your account page to unlock the recipe generator again.
          </p>
        </section>
      )}
      {!paid && !needsPaymentUpdate(subscriptionStatus) && (
        <section className="recipe-generator">
          <h2>Unlock the recipe generator</h2>
          <p className="auth-switch">
            Turn what's left in your kitchen into recipes with amounts that adjust and timers
            built in, and save your favorites to your recipe book. $20 a month, cancel anytime.
          </p>
          <ActionForm action={startCheckout} submitLabel="Subscribe for $20/month" />
        </section>
      )}
    </main>
  );
}
