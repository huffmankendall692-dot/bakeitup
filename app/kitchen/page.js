import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";
import { listRecipes } from "@/lib/recipes";

export const metadata = { title: "Your kitchen | Baking It Up" };

export default async function KitchenPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const recipes = await listRecipes(user.id);
  const paid = hasPaidAccess(user.subscription_status);

  return (
    <main className="app-page">
      <AppNav current="/kitchen" />
      <h1>What are we baking?</h1>
      <div className="choices">
        <Link href="/generator" className="choice">
          <h2>Recipe generator</h2>
          <p>Turn what's left in your kitchen into a new recipe.</p>
          {!paid && <span className="choice-tag">Subscribe to unlock</span>}
        </Link>
        <Link href="/recipes" className="choice">
          <h2>Recipe book</h2>
          <p>
            {recipes.length === 0
              ? "Recipes you save from the generator will appear here."
              : `${recipes.length} saved ${recipes.length === 1 ? "recipe" : "recipes"}.`}
          </p>
        </Link>
        <Link href="/preferences" className="choice">
          <h2>Allergies & preferences</h2>
          <p>Choose what to keep out of every recipe.</p>
        </Link>
      </div>
    </main>
  );
}
