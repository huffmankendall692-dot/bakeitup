"use client";

import { useActionState } from "react";

export default function ActionForm({ action, submitLabel, children }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="auth-form">
      {children}

      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="auth-notice" role="status">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
