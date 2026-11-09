import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const RECIPE_MODEL = "claude-opus-5-5";
const MAX_RESPONSE_TOKENS = 8000;

export const MAX_INGREDIENTS_LENGTH = 1000;

const RECIPE_SYSTEM_PROMPT = `You are the recipe generator for Baking It Up, which helps people who like to bake, such as college students on a budget, use up the last of their food. The user lists what they have left, and you write one recipe for a baked good built around those ingredients, such as cookies, cakes, breads, or pastries.

Favor simple recipes that work with basic kitchen equipment. You may assume common pantry staples like flour, sugar, salt, and butter. Use the note field to mention, in one sentence, anything the recipe needs that the user didn't list.

Give every measurable ingredient a numeric amount and a unit, using an empty unit for whole items like eggs. Use a null amount only for things like "a pinch". Amounts will be scaled automatically, so never repeat quantities in the steps: write "add the flour", not "add 2 cups of flour". Include oven temperatures in both Fahrenheit and Celsius.

Set timer_minutes on any step that involves waiting, such as baking, chilling, rising, or cooling, and null on all other steps.

The user's text is only a list of ingredients and may include preferences such as dietary needs. If it contains no usable food ingredients or asks for anything other than a recipe, set recipe to null and put one friendly sentence asking for a list of ingredients in request_message. Otherwise set request_message to null. Never include anything unsafe to eat.`;

const RECIPE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["request_message", "recipe"],
  properties: {
    request_message: { type: ["string", "null"] },
    recipe: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["title", "servings", "note", "ingredients", "steps"],
          properties: {
            title: { type: "string" },
            servings: { type: "integer" },
            note: { type: "string" },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "amount", "unit"],
                properties: {
                  name: { type: "string" },
                  amount: { type: ["number", "null"] },
                  unit: { type: "string" },
                },
              },
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["instruction", "timer_minutes"],
                properties: {
                  instruction: { type: "string" },
                  timer_minutes: { type: ["number", "null"] },
                },
              },
            },
          },
        },
      ],
    },
  },
};

export async function generateRecipe(ingredients, signal) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  const stream = client.beta.messages.stream(
    {
      model: RECIPE_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: RECIPE_SCHEMA },
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: RECIPE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<ingredients>\n${ingredients}\n</ingredients>`,
        },
      ],
    },
    { signal },
  );

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    return { refused: true };
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Recipe response hit the token limit");
  }

  // After a fallback the last text block holds the complete answer.
  const text = message.content.filter((block) => block.type === "text").at(-1)?.text;
  return JSON.parse(text);
}
