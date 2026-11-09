import Anthropic from "@anthropic-ai/sdk";
import { generateRecipe, MAX_INGREDIENTS_LENGTH } from "@/lib/anthropic";
import {
  attemptKey,
  clientIp,
  getCurrentUser,
  isRateLimited,
  recordAttempts,
} from "@/lib/auth";
import { hasPaidAccess } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUSY_ERROR = "The recipe generator is busy right now. Please try again in a moment.";
const UNAVAILABLE_ERROR = "The recipe generator isn't available right now. Please try again later.";
const REFUSAL_ERROR = "We couldn't create a recipe from that. Please try a different list of ingredients.";

function errorResponse(error, status) {
  return Response.json({ error }, { status });
}

function userMessageFor(error) {
  if (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError ||
    // Errors sent partway through a stream have no HTTP status and are temporary.
    (error instanceof Anthropic.APIError && error.status === undefined)
  ) {
    return BUSY_ERROR;
  }
  return UNAVAILABLE_ERROR;
}

export async function POST(request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Recipe session check failed:", error.message);
    return errorResponse(UNAVAILABLE_ERROR, 500);
  }
  if (!user) {
    return errorResponse("Your session has expired. Please log in again.", 401);
  }
  if (!hasPaidAccess(user.subscription_status)) {
    return errorResponse("Subscribe to create recipes.", 402);
  }

  const body = await request.json().catch(() => null);
  const ingredients = typeof body?.ingredients === "string" ? body.ingredients.trim() : "";
  if (!ingredients) {
    return errorResponse("Please list at least one ingredient.", 400);
  }
  if (ingredients.length > MAX_INGREDIENTS_LENGTH) {
    return errorResponse(
      `Please keep your list under ${MAX_INGREDIENTS_LENGTH} characters.`,
      400,
    );
  }

  try {
    const userKey = attemptKey("recipe-user", user.id);
    const ipKey = attemptKey("recipe-ip", await clientIp());
    const limited = await isRateLimited([
      { key: userKey, max: 10 },
      { key: ipKey, max: 30 },
    ]);
    if (limited) {
      return errorResponse("You've made a lot of recipes! Please try again in 15 minutes.", 429);
    }
    await recordAttempts([userKey, ipKey]);
  } catch (error) {
    console.error("Recipe rate limit check failed:", error.message);
    return errorResponse(UNAVAILABLE_ERROR, 500);
  }

  try {
    const result = await generateRecipe(ingredients, request.signal);
    if (result.refused) {
      return errorResponse(REFUSAL_ERROR, 422);
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) {
      return new Response(null, { status: 499 });
    }
    console.error("Recipe generation failed:", error.status ?? error.name, error.message);
    return errorResponse(userMessageFor(error), 503);
  }
}
