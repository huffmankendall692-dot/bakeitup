"use client";

import { useEffect, useRef, useState } from "react";

const CONNECTION_ERROR = "We lost the connection. Please try again.";

export default function RecipeGenerator({ maxLength }) {
  const [ingredients, setIngredients] = useState("");
  const [recipe, setRecipe] = useState("");
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [pending, setPending] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  async function readEvents(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    const handleLine = (line) => {
      if (!line) {
        return;
      }
      const event = JSON.parse(line);
      if (event.text) {
        setRecipe((current) => current + event.text);
      }
      if (event.error) {
        setRecipe("");
        setError(event.error);
        finished = true;
      }
      if (event.done) {
        setTruncated(event.truncated);
        finished = true;
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(handleLine);
    }
    handleLine(buffer);

    if (!finished) {
      throw new Error("Stream ended early");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setRecipe("");
    setError("");
    setTruncated(false);
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

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? CONNECTION_ERROR);
        return;
      }
      await readEvents(response);
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setRecipe("");
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
        <label htmlFor="ingredients">What ingredients do you have?</label>
        <textarea
          id="ingredients"
          value={ingredients}
          onChange={(event) => setIngredients(event.target.value)}
          maxLength={maxLength}
          rows={4}
          placeholder="Ripe bananas, walnuts, brown sugar…"
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

      {pending && !recipe && (
        <p className="auth-hint recipe-loading" role="status">
          Preheating the oven… this can take a few seconds.
        </p>
      )}
      {recipe && (
        <div className="recipe-output" aria-live="polite">
          {recipe}
        </div>
      )}
      {truncated && (
        <p className="auth-hint">This recipe was cut short. Try again for a complete version.</p>
      )}
    </section>
  );
}
