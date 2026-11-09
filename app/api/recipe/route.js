import Anthropic from "@anthropic-ai/sdk";
import { MAX_INGREDIENTS_LENGTH, streamRecipe } from "@/lib/anthropic";
import {
  attemptKey,
  clientIp,
  getCurrentUser,
  isRateLimited,
  recordAttempts,
} from "@/lib/auth";

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
  let userId;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Your session has expired. Please log in again.", 401);
    }
    userId = user.id;
  } catch (error) {
    console.error("Recipe session check failed:", error.message);
    return errorResponse(UNAVAILABLE_ERROR, 500);
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
    const userKey = attemptKey("recipe-user", userId);
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

  // Each line is a JSON event, so errors can still be reported after streaming starts.
  const encoder = new TextEncoder();
  let cancelled = false;
  let recipeStream;

  const responseBody = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        if (!cancelled) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      };

      try {
        recipeStream = streamRecipe(ingredients);
        for await (const event of recipeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ text: event.delta.text });
          }
        }

        const message = await recipeStream.finalMessage();
        if (message.stop_reason === "refusal") {
          send({ error: REFUSAL_ERROR });
        } else {
          send({ done: true, truncated: message.stop_reason === "max_tokens" });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Recipe generation failed:", error.status ?? error.name, error.message);
          send({ error: userMessageFor(error) });
        }
      } finally {
        if (!cancelled) {
          controller.close();
        }
      }
    },
    cancel() {
      // Stops the Claude request, and its cost, when the visitor leaves the page.
      cancelled = true;
      recipeStream?.abort();
    },
  });

  return new Response(responseBody, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
