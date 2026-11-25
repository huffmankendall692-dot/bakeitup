import "server-only";
import { getSql } from "@/lib/db";
import { EMPTY_PREFERENCES } from "@/lib/dietary";

export async function getPreferences(userId) {
  const sql = getSql();
  const rows = await sql`
    SELECT allergies, diets, avoid FROM user_preferences WHERE user_id = ${userId}
  `;
  return rows[0] ?? EMPTY_PREFERENCES;
}

export async function savePreferences(userId, preferences) {
  const sql = getSql();
  await sql`
    INSERT INTO user_preferences (user_id, allergies, diets, avoid)
    VALUES (${userId}, ${JSON.stringify(preferences.allergies)}::jsonb,
      ${JSON.stringify(preferences.diets)}::jsonb, ${preferences.avoid})
    ON CONFLICT (user_id) DO UPDATE
    SET allergies = EXCLUDED.allergies, diets = EXCLUDED.diets,
      avoid = EXCLUDED.avoid, updated_at = now()
  `;
}
