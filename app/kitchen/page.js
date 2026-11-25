import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess, syncSubscription } from "@/lib/billing";
import { listRecipes } from "@/lib/recipes";

export const metadata = { title: "Your kitchen | Baking It Up" };

export default async function KitchenPage({ searchParams }) {
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
  const recipes = paid ? await listRecipes(user.id) : [];

  return (
    <main className="app-page">
      <AppNav current="/kitchen" />
      <h1>What are we baking?</h1>

      {checkout === "success" && (
        <p className="auth-notice">
          {paid
            ? "Thanks for subscribing! Your recipe book and preferences are ready."
            : "We're still confirming your payment. Refresh this page in a moment."}
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="auth-notice">Checkout cancelled. You haven't been charged.</p>
      )}

      <div className="choices">
        <Link href="/generator" className="choice">
          <h2>Recipe generator</h2>
          <p>Turn what's left in your kitchen into a new recipe.</p>
        </Link>
        <Link href="/recipes" className="choice">
          <h2>Recipe book</h2>
          <p>
            {!paid
              ? "Save the recipes you love and come back to them anytime."
              : recipes.length === 0
                ? "Recipes you save from the generator will appear here."
                : `${recipes.length} saved ${recipes.length === 1 ? "recipe" : "recipes"}.`}
          </p>
          {!paid && <span className="choice-tag">Subscribe to unlock</span>}
        </Link>
        <Link href="/preferences" className="choice">
          <h2>Allergies & preferences</h2>
          <p>Choose what to keep out of every recipe.</p>
          {!paid && <span className="choice-tag">Subscribe to unlock</span>}
        </Link>
      </div>
    </main>
  );
}
