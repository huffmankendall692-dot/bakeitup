"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { cleanPreferences, MAX_AVOID_LENGTH } from "@/lib/dietary";
import { savePreferences } from "@/lib/preferences";

export async function updatePreferences(_previousState, formData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const preferences = cleanPreferences({
    allergies: formData.getAll("allergies"),
    diets: formData.getAll("diets"),
    avoid: formData.get("avoid"),
  });
  if (!preferences) {
    return {
      error: `Use only letters, numbers and commas in "Anything else to avoid", up to ${MAX_AVOID_LENGTH} characters.`,
    };
  }

  try {
    await savePreferences(user.id, preferences);
  } catch (error) {
    console.error("Saving preferences failed:", error.message);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/preferences");
  return { message: "Preferences saved. New recipes will follow them." };
}
