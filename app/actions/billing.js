"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateCustomer, getStripe, hasPaidAccess, needsPaymentUpdate } from "@/lib/billing";
import { appUrl } from "@/lib/email";

const CHECKOUT_ERROR = "We couldn't open checkout. Please try again in a moment.";
const PORTAL_ERROR = "We couldn't open your subscription settings. Please try again in a moment.";

export async function startCheckout() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (hasPaidAccess(user.subscription_status) || needsPaymentUpdate(user.subscription_status)) {
    redirect("/account");
  }

  let checkoutUrl;
  try {
    const price = process.env.STRIPE_PRICE_ID;
    if (!price) {
      throw new Error("STRIPE_PRICE_ID is not set");
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      integration_identifier: "baking-it-up-subscription-qkzmtwre",
      customer: await getOrCreateCustomer(user),
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl()}/account?checkout=success`,
      cancel_url: `${appUrl()}/account?checkout=cancelled`,
    });
    checkoutUrl = session.url;
  } catch (error) {
    console.error("Checkout failed:", error.message);
    return { error: CHECKOUT_ERROR };
  }

  redirect(checkoutUrl);
}

export async function openBillingPortal() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.stripe_customer_id) {
    return { error: PORTAL_ERROR };
  }

  let portalUrl;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl()}/account`,
    });
    portalUrl = session.url;
  } catch (error) {
    console.error("Billing portal failed:", error.message);
    return { error: PORTAL_ERROR };
  }

  redirect(portalUrl);
}
