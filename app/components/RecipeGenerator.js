"use client";

import { useEffect, useRef, useState } from "react";
import RecipeCard from "@/app/components/RecipeCard";

const CONNECTION_ERROR = "We lost the connection. Please try again.";

export default function RecipeGenerator({ maxLength }) {
  const [ingredients, setIngredients] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestRef = useRef(null);
  const recipeCountRef = useRef(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function handleSubmit(event) {
    event.preventDefault();
    setResult(null);
    setError("");
    setPending(true);

    const request = new AbortController();
    requestRef.current = request;

    try {
      const response = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
        signal: request.signal,
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? CONNECTION_ERROR);
        return;
      }
      recipeCountRef.current += 1;
      setResult(body);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(CONNECTION_ERROR);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="recipe-generator">
      <h2>Recipe generator</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="ingredients">What do you need to use up?</label>
        <textarea
          id="ingredients"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          maxLength={maxLength}
          rows={4}
          placeholder="Two browning bananas, the end of a bag of walnuts…"
          required
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending || !ingredients.trim()}>
          {pending ? "Writing your recipe…" : "Create recipe"}
        </button>
      </form>

      {pending && (
        <p className="auth-hint recipe-loading" role="status">
          Preheating the oven… this can take up to 30 seconds.
        </p>
      )}
      {result?.request_message && <p className="auth-notice recipe-loading">{result.request_message}</p>}
      {result?.recipe && <RecipeCard key={recipeCountRef.current} recipe={result.recipe} />}
    </section>
  );
}
