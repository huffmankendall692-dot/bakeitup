import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import DeleteRecipeButton from "@/app/components/DeleteRecipeButton";
import RecipeCard from "@/app/components/RecipeCard";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";

export const metadata = { title: "Recipe | Baking It Up" };

export default async function SavedRecipePage({ params }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const { id } = await params;
  const saved = await getRecipe(user.id, id);
  if (!saved) {
    notFound();
  }

  return (
    <main className="app-page">
      <AppNav current="/recipes" />
      <p className="auth-switch">
        <Link href="/recipes">← Back to recipe book</Link>
      </p>
      <RecipeCard recipe={saved.recipe}>
        <DeleteRecipeButton id={saved.id} />
      </RecipeCard>
    </main>
  );
}
