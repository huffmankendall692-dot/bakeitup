"use client";

import Link from "next/link";
import { useState } from "react";
import { saveToRecipeBook } from "@/app/actions/recipes";

export default function SaveRecipeButton({ recipe }) {
  const [savedId, setSavedId] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    setError("");
    try {
      const result = await saveToRecipeBook(recipe);
      if (result.error) {
        setError(result.error);
      } else {
        setSavedId(result.id);
      }
    } catch {
      setError("We lost the connection. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (savedId) {
    return (
      <p className="auth-notice recipe-saved" role="status">
        Saved to your recipe book. <Link href={`/recipes/${savedId}`}>View it</Link>
      </p>
    );
  }

  return (
    <div className="recipe-save">
      <button type="button" onClick={handleSave} disabled={pending}>
        {pending ? "Saving…" : "Save to recipe book"}
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
