"use client";

import { useState } from "react";

export default function AmountInput({ value, onChange, label }) {
  // While typing, keep the raw text so rescaling doesn't rewrite it mid-keystroke.
  const [draft, setDraft] = useState(null);

  function handleChange(event) {
    setDraft(event.target.value);
    const number = Number(event.target.value);
    if (number > 0) {
      onChange(number);
    }
  }

  return (
    <input
      className="amount-input"
      type="number"
      inputMode="decimal"
      min="0"
      step="any"
      aria-label={label}
      value={draft ?? value}
      onChange={handleChange}
      onBlur={() => setDraft(null)}
    />
  );
}
