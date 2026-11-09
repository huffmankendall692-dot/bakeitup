import "server-only";
import Stripe from "stripe";
import { getSql } from "@/lib/db";

// "comped" is set by us for accounts with free full access; Stripe never sends it.
const PAID_STATUSES = new Set(["active", "trialing", "comped"]);

export function hasPaidAccess(status) {
  return PAID_STATUSES.has(status);
}

// These customers still have a subscription, so a new checkout would charge them twice.
export function needsPaymentUpdate(status) {
  return status === "past_due" || status === "unpaid";
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export async function getOrCreateCustomer(user) {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await getStripe().customers.create({
    email: user.email,
    metadata: { user_id: user.id },
  });
  const sql = getSql();
  await sql`UPDATE users SET stripe_customer_id = ${customer.id} WHERE id = ${user.id}`;
  return customer.id;
}

// Reads the current state from Stripe, so webhooks arriving late or out of order can't leave it stale.
export async function syncSubscription(customerId) {
  const subscriptions = await getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });
  const current =
    subscriptions.data.find((subscription) => hasPaidAccess(subscription.status)) ??
    subscriptions.data[0];
  const status = current?.status ?? null;

  const sql = getSql();
  await sql`
    UPDATE users SET subscription_status = ${status}
    WHERE stripe_customer_id = ${customerId}
      AND subscription_status IS DISTINCT FROM 'comped'
  `;
  return status;
}
