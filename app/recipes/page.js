import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import Paywall from "@/app/components/Paywall";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";
import { listRecipes } from "@/lib/recipes";

export const metadata = { title: "Recipe book | Baking It Up" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function RecipeBookPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPaidAccess(user.subscription_status)) {
    return (
      <main className="app-page">
        <AppNav current="/recipes" />
        <h1>Recipe book</h1>
        <Paywall status={user.subscription_status} title="Unlock your recipe book" />
      </main>
    );
  }
  const recipes = await listRecipes(user.id);

  return (
    <main className="app-page">
      <AppNav current="/recipes" />
      <h1>Recipe book</h1>
      {recipes.length === 0 ? (
        <p className="auth-switch">
          No recipes yet. Make one in the <Link href="/generator">recipe generator</Link> and
          press <strong>Save to recipe book</strong>.
        </p>
      ) : (
        <ul className="recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.id}`}>{recipe.title}</Link>
              <span className="auth-hint">Saved {dateFormat.format(new Date(recipe.created_at))}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
