"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { formControlPaperClass } from "@/components/ui/form-styles";
import { cn } from "@/lib/utils/cn";

export function PasswordField({
  id,
  name,
  label,
  autoComplete,
  required = true,
  minLength,
  helpText,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  required?: boolean;
  /** Omit for sign-in / current-password fields that must accept existing credentials. */
  minLength?: number;
  helpText?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          className={cn(
            formControlPaperClass,
            "px-3.5 pr-12 transition placeholder:text-muted/70",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {helpText ? <p className="text-xs leading-5 text-muted">{helpText}</p> : null}
    </div>
  );
}
