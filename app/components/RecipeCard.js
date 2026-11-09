"use client";

import { useState } from "react";
import AmountInput from "@/app/components/AmountInput";
import StepTimer from "@/app/components/StepTimer";

function roundAmount(amount) {
  return Number(amount.toFixed(2));
}

export default function RecipeCard({ recipe }) {
  const [scale, setScale] = useState(1);

  return (
    <article className="recipe-card">
      <h3>{recipe.title}</h3>
      {recipe.note && <p className="auth-hint recipe-note">{recipe.note}</p>}

      <label className="recipe-servings">
        Servings
        <AmountInput
          label="Servings"
          value={roundAmount(recipe.servings * scale)}
          onChange={(servings) => setScale(servings / recipe.servings)}
        />
      </label>

      <h4>Ingredients</h4>
      <p className="auth-hint">Change any amount and the rest of the recipe adjusts to match.</p>
      <ul className="recipe-ingredients">
        {recipe.ingredients.map((ingredient, index) => (
          <li key={index}>
            {ingredient.amount > 0 && (
              <AmountInput
                label={`Amount of ${ingredient.name}`}
                value={roundAmount(ingredient.amount * scale)}
                onChange={(amount) => setScale(amount / ingredient.amount)}
              />
            )}
            <span>
              {ingredient.unit} {ingredient.name}
            </span>
          </li>
        ))}
      </ul>
      {scale !== 1 && (
        <>
          <button type="button" className="recipe-reset" onClick={() => setScale(1)}>
            Reset amounts
          </button>
          <p className="auth-hint">Baking times can change with a different batch size.</p>
        </>
      )}

      <h4>Steps</h4>
      <ol className="recipe-steps">
        {recipe.steps.map((step, index) => (
          <li key={index}>
            {step.instruction}
            {step.timer_minutes > 0 && <StepTimer minutes={step.timer_minutes} />}
          </li>
        ))}
      </ol>
    </article>
  );
}
