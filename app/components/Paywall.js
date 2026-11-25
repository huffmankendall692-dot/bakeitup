import Link from "next/link";
import { startCheckout } from "@/app/actions/billing";
import ActionForm from "@/app/components/ActionForm";
import { needsPaymentUpdate } from "@/lib/billing";

export default function Paywall({ status, title }) {
  if (needsPaymentUpdate(status)) {
    return (
      <section className="recipe-generator">
        <h2>Your last payment didn't go through</h2>
        <p className="auth-switch">
          Update your card on your <Link href="/account">account page</Link> to unlock this again.
        </p>
      </section>
    );
  }

  return (
    <section className="recipe-generator">
      <h2>{title}</h2>
      <p className="auth-switch">
        Subscribe to save recipes to your recipe book and keep your allergies and food
        preferences out of every recipe. $20 a month, cancel anytime.
      </p>
      <ActionForm action={startCheckout} submitLabel="Subscribe for $20/month" />
    </section>
  );
}
