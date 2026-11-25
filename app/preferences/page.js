import { redirect } from "next/navigation";
import { updatePreferences } from "@/app/actions/preferences";
import ActionForm from "@/app/components/ActionForm";
import AppNav from "@/app/components/AppNav";
import Paywall from "@/app/components/Paywall";
import { getCurrentUser } from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";
import { ALLERGIES, DIETS, MAX_AVOID_LENGTH } from "@/lib/dietary";
import { getPreferences } from "@/lib/preferences";

export const metadata = { title: "Allergies & preferences | Baking It Up" };

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasPaidAccess(user.subscription_status)) {
    return (
      <main className="app-page">
        <AppNav current="/preferences" />
        <h1>Allergies & preferences</h1>
        <Paywall status={user.subscription_status} title="Unlock allergies & preferences" />
      </main>
    );
  }
  const preferences = await getPreferences(user.id);

  return (
    <main className="app-page">
      <AppNav current="/preferences" />
      <h1>Allergies & preferences</h1>
      <p className="auth-switch">
        Every recipe the generator makes will leave these out.
      </p>

      <ActionForm action={updatePreferences} submitLabel="Save preferences">
        <fieldset className="check-group">
          <legend>Allergies</legend>
          {ALLERGIES.map((allergy) => (
            <label key={allergy.id} className="check">
              <input
                type="checkbox"
                name="allergies"
                value={allergy.id}
                defaultChecked={preferences.allergies.includes(allergy.id)}
              />
              {allergy.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="check-group">
          <legend>Diet</legend>
          {DIETS.map((diet) => (
            <label key={diet.id} className="check">
              <input
                type="checkbox"
                name="diets"
                value={diet.id}
                defaultChecked={preferences.diets.includes(diet.id)}
              />
              {diet.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="avoid">Anything else to avoid</label>
        <input
          id="avoid"
          name="avoid"
          type="text"
          maxLength={MAX_AVOID_LENGTH}
          defaultValue={preferences.avoid}
          placeholder="Raisins, coconut, cinnamon"
        />
        <p className="auth-hint">Separate items with commas.</p>
      </ActionForm>

      <p className="auth-hint allergy-warning">
        Recipes are written by AI and can make mistakes. If you have a food allergy, always
        check ingredient labels before you bake.
      </p>
    </main>
  );
}
