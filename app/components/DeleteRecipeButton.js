"use client";

import { removeFromRecipeBook } from "@/app/actions/recipes";

export default function DeleteRecipeButton({ id }) {
  function confirmDelete(event) {
    if (!window.confirm("Delete this recipe from your recipe book?")) {
      event.preventDefault();
    }
  }

  return (
    <form action={removeFromRecipeBook} onSubmit={confirmDelete} className="recipe-delete">
      <input type="hidden" name="id" value={id} />
      <button type="submit">Delete recipe</button>
    </form>
  );
}
