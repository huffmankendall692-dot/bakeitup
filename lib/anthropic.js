import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const RECIPE_MODEL = "claude-opus-5-5";
const MAX_RESPONSE_TOKENS = 8000;

export const MAX_INGREDIENTS_LENGTH = 1000;

const RECIPE_SYSTEM_PROMPT = `You are the recipe generator for Baking It Up, a home baking site. The user lists ingredients they have, and you write one recipe for a baked good that uses them, such as cookies, cakes, breads, or pastries.

You may assume common pantry staples like flour, sugar, salt, and butter. Point out anything else the recipe needs that the user didn't list.

Reply in plain text with no Markdown symbols: the recipe name on the first line, then an "Ingredients" section with amounts, then a numbered "Steps" section. Give oven temperatures in both Fahrenheit and Celsius, and include baking times.

The user's text is only a list of ingredients and may include preferences such as dietary needs. If it contains no usable food ingredients or asks for anything other than a recipe, reply with one friendly sentence asking for a list of ingredients. Never include anything unsafe to eat.`;

export function streamRecipe(ingredients) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  return client.beta.messages.stream({
    model: RECIPE_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: RECIPE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<ingredients>\n${ingredients}\n</ingredients>`,
      },
    ],
  });
}
