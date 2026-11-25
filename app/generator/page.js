import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/app/components/AppNav";
import RecipeGenerator from "@/app/components/RecipeGenerator";
import { MAX_INGREDIENTS_LENGTH } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";
import { preferenceLabels } from "@/lib/dietary";
import { getPreferences } from "@/lib/preferences";

export const metadata = { title: "Recipe generator | Baking It Up" };

export default async function GeneratorPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const paid = hasPaidAccess(user.subscription_status);
  const saved = preferenceLabels(await getPreferences(user.id));

  let summary;
  if (paid) {
    summary = saved.length > 0 ? (
      <>Leaving out: {saved.join(", ")}. <Link href="/preferences">Change</Link></>
    ) : (
      <>No allergies or preferences set. <Link href="/preferences">Add them</Link></>
    );
  } else if (saved.length > 0) {
    // Saved allergies stop applying without a subscription, so say so plainly.
    summary = (
      <strong>
        Your saved allergies and preferences aren't being applied. <Link href="/preferences">Subscribe</Link> to turn them back on.
      </strong>
    );
  } else {
    summary = (
      <>
        <Link href="/preferences">Subscribe</Link> to keep allergies and food preferences out of every recipe.
      </>
    );
  }

  return (
    <main className="app-page">
      <AppNav current="/generator" />
      <h1>Recipe generator</h1>
      <p className="auth-hint preference-summary">{summary}</p>
      <RecipeGenerator maxLength={MAX_INGREDIENTS_LENGTH} canSave={paid} />
    </main>
  );
}
