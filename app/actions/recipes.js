"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";
import { cleanRecipe, deleteRecipe, saveRecipe } from "@/lib/recipes";

export async function saveToRecipeBook(recipe) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Your session has expired. Please log in again." };
  }
  if (!hasPaidAccess(user.subscription_status)) {
    return { error: "Subscribe to save recipes." };
  }

  const cleaned = cleanRecipe(recipe);
  if (!cleaned) {
    return { error: "This recipe couldn't be saved." };
  }

  try {
    const id = await saveRecipe(user.id, cleaned);
    if (!id) {
      return { error: "Your recipe book is full. Delete a recipe to make room." };
    }
    return { id };
  } catch (error) {
    console.error("Saving recipe failed:", error.message);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function removeFromRecipeBook(formData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const id = formData.get("id");
  if (typeof id === "string") {
    await deleteRecipe(user.id, id);
  }
  redirect("/recipes");
}
