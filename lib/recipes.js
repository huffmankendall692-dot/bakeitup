import "server-only";
import { getSql } from "@/lib/db";

const MAX_SAVED_RECIPES = 500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanText(value, maxLength) {
  return typeof value === "string" && value.trim() && value.length <= maxLength
    ? value.trim()
    : null;
}

function cleanPositive(value, max) {
  if (value === null) {
    return null;
  }
  return Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
}

// Recipes arrive from the browser, so only the known shape is stored.
export function cleanRecipe(input) {
  if (!input || typeof input !== "object") {
    return null;
  }
  const title = cleanText(input.title, 200);
  const servings = Number.isInteger(input.servings) ? cleanPositive(input.servings, 1000) : undefined;
  const note = typeof input.note === "string" && input.note.length <= 1000 ? input.note : null;
  const { ingredients, steps } = input;
  if (
    !title ||
    !servings ||
    note === null ||
    !Array.isArray(ingredients) ||
    !Array.isArray(steps) ||
    ingredients.length === 0 ||
    steps.length === 0 ||
    ingredients.length > 60 ||
    steps.length > 60
  ) {
    return null;
  }

  const cleanIngredients = ingredients.map((ingredient) => ({
    name: cleanText(ingredient?.name, 500),
    amount: cleanPositive(ingredient?.amount ?? null, 100000),
    unit: typeof ingredient?.unit === "string" && ingredient.unit.length <= 50 ? ingredient.unit : null,
  }));
  const cleanSteps = steps.map((step) => ({
    instruction: cleanText(step?.instruction, 2000),
    timer_minutes: cleanPositive(step?.timer_minutes ?? null, 1440),
  }));
  if (
    cleanIngredients.some((i) => !i.name || i.amount === undefined || i.unit === null) ||
    cleanSteps.some((s) => !s.instruction || s.timer_minutes === undefined)
  ) {
    return null;
  }

  return { title, servings, note, ingredients: cleanIngredients, steps: cleanSteps };
}

export async function saveRecipe(userId, recipe) {
  const sql = getSql();
  const [{ count }] = await sql`SELECT count(*) FROM saved_recipes WHERE user_id = ${userId}`;
  if (Number(count) >= MAX_SAVED_RECIPES) {
    return null;
  }
  const rows = await sql`
    INSERT INTO saved_recipes (user_id, title, recipe)
    VALUES (${userId}, ${recipe.title}, ${JSON.stringify(recipe)}::jsonb)
    RETURNING id
  `;
  return rows[0].id;
}

export function listRecipes(userId) {
  const sql = getSql();
  return sql`
    SELECT id, title, created_at FROM saved_recipes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
}

export async function getRecipe(userId, id) {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }
  const sql = getSql();
  const rows = await sql`
    SELECT id, recipe, created_at FROM saved_recipes
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function deleteRecipe(userId, id) {
  if (!UUID_PATTERN.test(id)) {
    return;
  }
  const sql = getSql();
  await sql`DELETE FROM saved_recipes WHERE id = ${id} AND user_id = ${userId}`;
}
