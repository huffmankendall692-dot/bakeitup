"use client";

import { useActionState } from "react";

export default function AuthForm({ action, submitLabel, passwordAutoComplete, passwordHint }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="auth-form">
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state?.email ?? ""}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={passwordAutoComplete}
        required
      />
      {passwordHint && <p className="auth-hint">{passwordHint}</p>}

      {state?.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
