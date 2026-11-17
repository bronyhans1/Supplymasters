"use client";

import { useId, useMemo, useState } from "react";
import {
  isKnownOption,
  resolveSelectableValue,
} from "@/config/product-options";
import { formControlClass } from "@/components/ui/form-styles";

const controlClass = formControlClass;

export function SelectWithOther({
  name,
  label,
  options,
  defaultValue = "",
  required,
  helpText,
  customPlaceholder = "Enter a custom value",
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
  required?: boolean;
  helpText?: string;
  customPlaceholder?: string;
}) {
  const selectId = useId();
  const customId = useId();

  const initial = useMemo(() => {
    const trimmed = defaultValue.trim();
    if (!trimmed) {
      return { selection: "", custom: "" };
    }
    if (isKnownOption(options, trimmed) && trimmed !== "Other") {
      return { selection: trimmed, custom: "" };
    }
    return { selection: "Other", custom: trimmed };
  }, [defaultValue, options]);

  const [selection, setSelection] = useState(initial.selection);
  const [custom, setCustom] = useState(initial.custom);
  const showCustom = selection === "Other";

  const resolved =
    selection === ""
      ? ""
      : resolveSelectableValue(selection, custom, options);

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        value={selection}
        required={required}
        onChange={(event) => {
          const next = event.target.value;
          setSelection(next);
          if (next !== "Other") {
            setCustom("");
          }
        }}
        className={controlClass}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {showCustom ? (
        <div className="space-y-1">
          <label htmlFor={customId} className="sr-only">
            Custom {label.toLowerCase()}
          </label>
          <input
            id={customId}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            required={required}
            placeholder={customPlaceholder}
            className={controlClass}
          />
        </div>
      ) : null}

      {/* Single submitted value for create/update actions */}
      <input type="hidden" name={name} value={resolved} />

      {helpText ? (
        <p className="text-xs leading-5 text-muted">{helpText}</p>
      ) : null}
    </div>
  );
}
