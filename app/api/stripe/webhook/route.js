import { getStripe, syncSubscription } from "@/lib/billing";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // The signature covers the exact bytes Stripe sent, so this must stay unparsed.
  const payload = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      request.headers.get("stripe-signature"),
      secret,
    );
  } catch (error) {
    console.error("Stripe webhook rejected:", error.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (SUBSCRIPTION_EVENTS.has(event.type) && event.data.object.customer) {
    try {
      await syncSubscription(event.data.object.customer);
    } catch (error) {
      // A failure status makes Stripe send the event again later.
      console.error("Subscription sync failed:", error.message);
      return Response.json({ error: "Sync failed" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
